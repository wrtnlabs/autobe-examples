import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";

export async function test_api_redditCommunity_member_communities_subscriptions_update(
  connection: api.IConnection,
) {
  const output: IRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.communities.subscriptions.update(
      connection,
      {
        communityName: typia.random<string>(),
        subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IRedditCommunityCommunitySubscription.IUpdate>(),
      },
    );
  typia.assert(output);
}
