import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportReason";
import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditCommunity_communityModerator_reportReasons_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityReportReason.ISummary =
    await api.functional.redditCommunity.communityModerator.reportReasons.index(
      connection,
      {
        body: typia.random<IRedditCommunityReportReason.IRequest>(),
      },
    );
  typia.assert(output);
}
