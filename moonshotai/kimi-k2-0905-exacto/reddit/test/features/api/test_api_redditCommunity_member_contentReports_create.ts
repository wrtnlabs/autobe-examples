import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";

export async function test_api_redditCommunity_member_contentReports_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityContentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: typia.random<IRedditCommunityContentReport.ICreate>(),
      },
    );
  typia.assert(output);
}
