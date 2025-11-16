import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentReport";
import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";

export async function test_api_redditCommunity_platformModerator_reports_content_moderation_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.platformModerator.reports.content_moderation.index(
      connection,
      {
        body: typia.random<IRedditCommunityContentReport.IRequest>(),
      },
    );
  typia.assert(output);
}
