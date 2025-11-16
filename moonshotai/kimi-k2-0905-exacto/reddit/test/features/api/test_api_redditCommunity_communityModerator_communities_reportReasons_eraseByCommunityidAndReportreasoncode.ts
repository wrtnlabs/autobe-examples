import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_redditCommunity_communityModerator_communities_reportReasons_eraseByCommunityidAndReportreasoncode(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.communityModerator.communities.reportReasons.eraseByCommunityidAndReportreasoncode(
      connection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        reportReasonCode: typia.random<string>(),
      },
    );
  typia.assert(output);
}
