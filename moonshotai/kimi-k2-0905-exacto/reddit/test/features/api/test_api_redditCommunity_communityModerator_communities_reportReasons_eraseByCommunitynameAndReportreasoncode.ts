import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

export async function test_api_redditCommunity_communityModerator_communities_reportReasons_eraseByCommunitynameAndReportreasoncode(
  connection: api.IConnection,
) {
  const output =
    await api.functional.redditCommunity.communityModerator.communities.reportReasons.eraseByCommunitynameAndReportreasoncode(
      connection,
      {
        communityName: typia.random<string>(),
        reportReasonCode: typia.random<string>(),
      },
    );
  typia.assert(output);
}
