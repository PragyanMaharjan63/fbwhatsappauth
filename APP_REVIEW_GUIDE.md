# App Review Recording and Reviewer Guide

## What the reviewer can reproduce

With a Facebook account authorized for the Meta app and assigned to a Business Portfolio, the reviewer can:

1. Open the Avernek demo and choose **Connect Meta Business**.
2. See Meta's real authorization screen for the configured General Facebook Login for Business flow.
3. Authorize `business_management` and return to the application.
4. See the authorized administrator name when `/me` permits it.
5. See granted permissions returned by `/me/permissions` and token-validation status returned by `/debug_token`.
6. Select a real portfolio returned by `/me/businesses`.
7. See the selected portfolio's ID, name, and verification status when Meta returns it.
8. See real results—or Meta's real error—for owned Pages and ad accounts.
9. Refresh the Graph API data and disconnect the server-side session.

The walkthrough marks a step complete only when the corresponding live state exists. No data or success state is simulated.

## Suggested screen recording

Keep the browser address bar visible and record one continuous take:

1. Start on the disconnected page. Briefly show the statement that data is read only after authorization.
2. Click **Connect Meta Business**.
3. Show the genuine Meta domain and authorization UI. Do not expose a password or any access token.
4. Select/authorize the test Business Portfolio and return to Avernek.
5. Point out the administrator, token validation, and the granted `business_management` permission.
6. Select the portfolio. Point out that the name and Business ID came from `GET /me/businesses` and `GET /{business-id}`.
7. Show the asset cards. Explain that these read-only calls establish which portfolio-owned assets are available when configuring a client's automation services.
8. If Meta denies an asset edge, show the error panel and explain that the demo preserves the actual permission limitation.
9. Click **Refresh information** to demonstrate a fresh API request.
10. Click **Disconnect** and show that the dashboard returns to the disconnected state.

State plainly in the narration: “Avernek requires `business_management` to identify an authorized client's Business Portfolio and read its business-owned assets before configuring integrations. This flow does not perform WhatsApp onboarding, QR scanning, phone registration, or migration.”

## Reviewer instructions to submit

1. Visit the HTTPS review URL.
2. Use the provided test Facebook account, or a reviewer account with access to the supplied test Business Portfolio.
3. Click **Connect Meta Business** and approve the Meta authorization prompt.
4. Back in the demo, select an accessible portfolio.
5. Review its live business information, asset responses, and granted-permission panel.
6. Use **Refresh information** to repeat the Graph API reads.
7. Use **Disconnect** to delete the application session.

Provide Meta with any required test-user credentials through the secure App Review credential fields, never in source code or the recording.

## Evidence to include in the submission

- Exact use-case explanation for `business_management`
- Review URL and step-by-step instructions
- Test account and portfolio access through Meta's secure reviewer fields
- Screen recording covering authorization, `/me/businesses`, portfolio selection, live business information, assets, refresh, and disconnect
- Confirmation that the Configuration ID uses the General variation and a User access token

Do not claim that Advanced Access is already approved. Do not include fabricated assets to make the flow look successful.
