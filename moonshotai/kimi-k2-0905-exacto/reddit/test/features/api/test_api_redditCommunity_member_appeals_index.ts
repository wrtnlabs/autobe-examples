import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";

export async function test_api_redditCommunity_member_appeals_index(
  connection: api.IConnection,
) {
  const output = await api.functional.redditCommunity.member.appeals.index(
    connection,
    {
      body: typia.random<IRedditCommunityAppeal.IRequest>(),
    },
  );
  typia.assert(output);
}
