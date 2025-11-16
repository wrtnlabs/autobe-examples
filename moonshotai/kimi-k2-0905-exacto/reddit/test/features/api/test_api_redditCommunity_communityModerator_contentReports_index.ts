import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentReport";
import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";

export async function test_api_redditCommunity_communityModerator_contentReports_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityContentReport =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: typia.random<IRedditCommunityContentReport.IRequest>(),
      },
    );
  typia.assert(output);
}
