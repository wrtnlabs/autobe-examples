import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditCommunity_platformModerator_reportReasons_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityReportReason =
    await api.functional.redditCommunity.platformModerator.reportReasons.update(
      connection,
      {
        reportReasonCode: typia.random<string>(),
        body: typia.random<IRedditCommunityReportReason.IUpdate>(),
      },
    );
  typia.assert(output);
}
