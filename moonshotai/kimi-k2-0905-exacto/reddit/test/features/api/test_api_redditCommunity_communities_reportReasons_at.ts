import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditCommunity_communities_reportReasons_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityReportReason =
    await api.functional.redditCommunity.communities.reportReasons.at(
      connection,
      {
        communityName: typia.random<string>(),
        reportReasonCode: typia.random<string>(),
      },
    );
  typia.assert(output);
}
