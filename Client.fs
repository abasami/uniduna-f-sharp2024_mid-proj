namespace MidPrjFuji

open WebSharper
open WebSharper.JavaScript
open WebSharper.UI
open WebSharper.UI.Client
open WebSharper.UI.Templating
open WebSharper.Sitelets
open WebSharper.UI.Notation
open WebSharper.Charting
open WebSharper.UI.Html

// The templates are loaded from the DOM, so you just can edit index.html
// and refresh your browser, no need to recompile unless you add or remove holes.
type IndexTemplate = Template<"wwwroot/index.html", ClientLoad.FromDocument>

type EndPoint =
    | [<EndPoint "/">] Home
    | [<EndPoint "/page1">] Page1


[<JavaScript>]
module Pages =

    let now = System.DateTime.Now
    let People =
        ListModel.FromSeq [
            ("John", "170", "60", "20")
            ("Paul", "180", "50", "15")
            ("Sara", "160", "50", "19")
            ("Mery", "170", "60", "20")
        ]


    let str = JS.Window.LocalStorage
    let healthData = Var.Create ""


    let strage = JS.Window.LocalStorage
    let counter = 
        let curr = strage.GetItem "counter"
        if curr = "" then
            0
        else
            int curr
        |> Var.Create

    let HomePage() =
        let newName = Var.Create ""
        let newHeight = Var.Create ""
        let newWeight = Var.Create ""
        let newBMI = Var.Create 0
        let eval = Var.Create ""  // evalを初期化


        IndexTemplate.HomePage()
            .Decrement(fun e -> 
                counter := counter.Value - 1
                strage.SetItem("counter", string counter.Value)
            )
            .Increment(fun e -> 
                counter := counter.Value + 1
                strage.SetItem("counter", string counter.Value)

            )         

            .ListContainer(
                People.View.DocSeqCached(fun (name: string, height: string, weight: string, bmi: string) ->
                    IndexTemplate.ListItem().Name(name).Height(height).Weight(weight).BMI(bmi).Doc()
                )
            )
            .Name(newName)
            .Height(newHeight)
            .Weight(newWeight)
            .Add(fun _ ->
                let heightInMeters = float newHeight.Value / 100.0
                let weightInKg = float newWeight.Value
                let bmi = weightInKg / (heightInMeters * heightInMeters)
                newBMI.Value <- int bmi
                People.Add(newName.Value, newHeight.Value, newWeight.Value, string newBMI.Value)  // BMIを追加
                healthData.Value <- "[" + newName.Value + "'s HEALTH-DATA]    HEIGHT:  " + newHeight.Value + "cm  / WEIGHT:  " + newWeight.Value + "kg  / BMI:  " + string  newBMI.Value + "."
                str.SetItem(newName.Value, healthData.Value)  // ここでローカルストレージにデータを保存します

                 // ページを再読み込みします。
                //JS.Window.Location.Reload()
                // evalの値を設定
                if counter.Value >= 3 && newBMI.Value <= 25 then
                    eval.Value <- "+++ GOOD HEALTH"
                elif counter.Value < 3 && newBMI.Value <= 25 then
                    eval.Value <- "++ NORMAL HEALTH"
                elif counter.Value >= 3 && newBMI.Value > 20 then
                    eval.Value <- "++ NORMAL HEALTH"
                else
                    eval.Value <- "+ NOT HEALTHY"

                newName.Value <- ""
                newHeight.Value <- ""
                newWeight.Value <- ""
            )
            .Result(View.Map string healthData.View)
            .Eval(View.Map string eval.View)  // evalの結果を表示
            .Clear(fun e -> 
                counter.Value <- 0
            )

            .Value(View.Map string counter.View)
            .CheckDate(string now.Year + "/" + string now.Month + "/" + string now.Day)

            .Doc()
    
    //open System


    let Page1() =
        IndexTemplate.Page1()


           .Doc()





[<JavaScript>]
module App =
    //open WebSharper.UI.Notation
    //open WebSharper.JavaScript


    let router = Router.Infer<EndPoint>()
    let currentPage = Router.InstallHash Home router
    let state = 0
    let month = System.DateTime.Now.Month


    [<SPAEntryPoint>]
    let Main () =

        let renderInnerPage (currentPage: Var<EndPoint>) =
            currentPage.View.Map(fun endpoint ->
                match endpoint with
                | Home   -> Pages.HomePage()
                | Page1  -> Pages.Page1()
            )
            |> Doc.EmbedView
        IndexTemplate()
            .Url_Home("/")
            .Url_Page1("/#/page1")
            .TakeMeHome(fun e ->
                 currentPage := EndPoint.Home
                 if month < 6 then
                     JS.Window.Alert( "Now, It's still month of  " + string month + " .  so it's a good time to start doing some healthy things!  Let't check at the homepage.")
                 else if month < 10 then
                     JS.Window.Alert( "Now, it is month of " + string month + " .  so you still have time to start living a healthier lifestyle!  Let't check at the homepage.")
                 else 
                    JS.Window.Alert( "Now, it is month of  " + string month + " .  Start living a healthy lifestyle in preparation for next year.!  Let't check at the homepage.")
            )
            .MainContainer(renderInnerPage currentPage)
            .Bind()

        // 棒グラフ
        let ct = Pages.counter.Value
        let labels =
            [| "Your"; "John"; "Paul"; "Sara"; "Mery" |]
        let dataset1 = [|float ct; 2.0; 3.0; 1.0; 4.0|]
    
        let chart =
            Chart.Combine [
                Chart.Bar(Array.zip labels dataset1)
                    .WithFillColor(Color.Rgba(151, 187, 205, 0.2))
                    .WithStrokeColor(Color.Name "blue")
            ]
    
        Renderers.ChartJs.Render(chart, Size = Size(600, 300))
        |> Doc.RunAppendById "Chart1"

        // レーダーチャート
        let labels =
            [| "Eating"; "Drinking"; "Sleeping";
               "Designing"; "Coding"; "Cycling"; "Running" |]
        let dataset1 = [|28.0; 48.0; 40.0; 19.0; 96.0; 27.0; 100.0|]
        let dataset2 = [|65.0; 59.0; 90.0; 81.0; 56.0; 55.0; 40.0|]
    
        let chart =
            Chart.Combine [
                Chart.Radar(Array.zip labels dataset1)
                    .WithFillColor(Color.Rgba(151, 187, 205, 0.2))
                    .WithStrokeColor(Color.Name "blue")
                    .WithPointColor(Color.Name "darkblue")

                Chart.Radar(Array.zip labels dataset2)
                    .WithFillColor(Color.Rgba(220, 220, 220, 0.2))
                    .WithStrokeColor(Color.Name "green")
                    .WithPointColor(Color.Name "darkgreen")
            ]
    
        Renderers.ChartJs.Render(chart, Size = Size(600, 400))
        |> Doc.RunAppendById "Chart"
