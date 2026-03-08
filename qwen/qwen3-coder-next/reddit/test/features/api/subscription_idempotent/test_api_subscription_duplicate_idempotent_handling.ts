import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

export async function test_api_subscription_duplicate_idempotent_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberSession.token.access,
  };
  // 2. First subscription request
  const firstSubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: "test-community",
      },
    );
  typia.assert(firstSubscription);
  const firstSubscriptionId = firstSubscription.id;
  // 3. Duplicate subscription request (idempotent test)
  const secondSubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: "test-community",
      },
    );
  typia.assert(secondSubscription);
  // 4. Validation - core idempotent behavior
  TestValidator.equals(
    "duplicate subscription returns same ID",
    secondSubscription.id,
    firstSubscriptionId,
  );
  TestValidator.equals(
    "subscription status remains subscribed",
    secondSubscription.status,
    "subscribed",
  );
  TestValidator.equals(
    "subscription community name matches",
    secondSubscription.community.name,
    "test-community",
  );
}
