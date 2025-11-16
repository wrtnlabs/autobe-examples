import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditCommunity_platformModerator_communities_reportReasons_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityReportReason =
    await api.functional.redditCommunity.platformModerator.communities.reportReasons.create(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityReportReason.ICreate>(),
      },
    );
  typia.assert(output);
}
