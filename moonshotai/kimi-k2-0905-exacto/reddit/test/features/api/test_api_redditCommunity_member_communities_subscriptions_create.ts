import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";

export async function test_api_redditCommunity_member_communities_subscriptions_create(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.create(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunitySubscription.ICreate>(),
      },
    );
  typia.assert(output);
}
