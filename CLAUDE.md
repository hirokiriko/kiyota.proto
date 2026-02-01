# CLAUDE.md

## デプロイ確認

ユーザーが「確認したい。」と言ったら、以下の手順で誘導する。

1. 現在のブランチに未 push のコミットがあれば push する
2. main ブランチへの PR がまだなければ作成を促す
3. PR をマージしてもらう（マージで GitHub Actions が走り Firebase に自動デプロイされる）
4. デプロイ完了後、以下の URL で確認するよう案内する

URL: https://kiyota-proto-dx.web.app

## Cloud Functions 注意事項

- Cloud Functions は **GCFv2（第2世代）** でデプロイ済み。**絶対に v1 にダウングレードしないこと。**
- Firebase は一度 v2 でデプロイした関数を v1 に変更できない（`Functions cannot be downgraded from GCFv2 to GCFv1` エラーになる）。
- import は `firebase-functions/v2/https` を使用すること。
