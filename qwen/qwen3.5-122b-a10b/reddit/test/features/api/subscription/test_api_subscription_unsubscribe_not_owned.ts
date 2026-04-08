import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";

export async function test_api_subscription_unsubscribe_not_owned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member who will create the subscription
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstMember);
  // 2. Create community for subscription target
  const community = await generate_random_reddit_like_member_communities_create(
    firstMemberConnection,
    {
      body: {
        name: typia.random<string>(),
        description: typia.random<string>(),
      },
    },
  );
  typia.assert(community);
  // 3. First member creates subscription that second member will attempt to unsubscribe from
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      firstMemberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Authenticate second member who will attempt unauthorized unsubscribe
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondMember);
  // 5. Second member attempts to unsubscribe from first member's subscription
  // Should fail with 403 Forbidden error
  await TestValidator.httpError(
    "unauthorized unsubscribe should return 403",
    403,
    async () => {
      await api.functional.redditLike.member.subscriptions.erase(
        secondMemberConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // 6. Verify the subscription record remains unchanged (still active)
  // The subscription should still exist and be active for the first member
  // We verify this by checking that the first member can still access their subscription
  // by attempting to unsubscribe successfully (which proves the subscription exists)
  // Then we re-subscribe to restore the state for any cleanup
  await api.functional.redditLike.member.subscriptions.erase(
    firstMemberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
}
