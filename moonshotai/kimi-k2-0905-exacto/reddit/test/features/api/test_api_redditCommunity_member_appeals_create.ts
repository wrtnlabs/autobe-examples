import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAppeal";

export async function test_api_redditCommunity_member_appeals_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityAppeal =
    await api.functional.redditCommunity.member.appeals.create(connection, {
      body: typia.random<IRedditCommunityAppeal.ICreate>(),
    });
  typia.assert(output);
}
