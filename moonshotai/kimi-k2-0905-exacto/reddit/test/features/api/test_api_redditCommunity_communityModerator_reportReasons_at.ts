import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditCommunity_communityModerator_reportReasons_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityReportReason =
    await api.functional.redditCommunity.communityModerator.reportReasons.at(
      connection,
      {
        reportReasonCode: typia.random<string>(),
      },
    );
  typia.assert(output);
}
