import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function test_api_redditCommunity_member_communities_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: typia.random<IRedditCommunityCommunity.ICreate>(),
    });
  typia.assert(output);
}
