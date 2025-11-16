import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunitySubscription";
import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";

export async function test_api_redditCommunity_visitor_communities_subscriptions_index(
  connection: api.IConnection,
) {
  const output: IPageIRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.visitor.communities.subscriptions.index(
      connection,
      {
        communityName: typia.random<string>(),
        body: typia.random<IRedditCommunityCommunitySubscription.IRequest>(),
      },
    );
  typia.assert(output);
}
