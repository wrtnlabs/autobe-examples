import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";

export async function test_api_redditCommunity_member_appeals_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityAppeal =
    await api.functional.redditCommunity.member.appeals.update(connection, {
      appealId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditCommunityAppeal.IUpdate>(),
    });
  typia.assert(output);
}
