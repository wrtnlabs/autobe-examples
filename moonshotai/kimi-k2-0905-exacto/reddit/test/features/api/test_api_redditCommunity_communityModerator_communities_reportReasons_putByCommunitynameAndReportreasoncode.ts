import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditCommunity_communityModerator_communities_reportReasons_putByCommunitynameAndReportreasoncode(
  connection: api.IConnection,
) {
  const output: IRedditCommunityReportReason =
    await api.functional.redditCommunity.communityModerator.communities.reportReasons.putByCommunitynameAndReportreasoncode(
      connection,
      {
        communityName: typia.random<string>(),
        reportReasonCode: typia.random<string>(),
        body: typia.random<IRedditCommunityReportReason.IUpdate>(),
      },
    );
  typia.assert(output);
}
