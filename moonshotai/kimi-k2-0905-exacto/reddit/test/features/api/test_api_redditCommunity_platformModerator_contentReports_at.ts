import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";

export async function test_api_redditCommunity_platformModerator_contentReports_at(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentReport =
    await api.functional.redditCommunity.platformModerator.contentReports.at(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
