import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityHelpDesk } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityHelpDesk";
import { IRedditCommunityHelpDesk } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityHelpDesk";

export async function test_api_redditCommunity_helpDesk_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityHelpDesk.ISummary =
    await api.functional.redditCommunity.helpDesk.index(connection, {
      body: typia.random<IRedditCommunityHelpDesk.IRequest>(),
    });
  typia.assert(output);
}
