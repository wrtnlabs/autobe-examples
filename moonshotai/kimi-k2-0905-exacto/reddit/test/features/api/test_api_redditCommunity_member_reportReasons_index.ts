import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportReason";
import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";

export async function test_api_redditCommunity_member_reportReasons_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityReportReason.ISummary =
    await api.functional.redditCommunity.member.reportReasons.index(
      connection,
      {
        body: typia.random<IRedditCommunityReportReason.IRequest>(),
      },
    );
  typia.assert(output);
}
