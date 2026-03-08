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

export async function test_api_subscription_deletion_prevent_zero_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IRedditLikeMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "12345678",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  };
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 2. Create a subscription to a community
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await api.functional.redditLike.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_like_member_id: member.id,
          reddit_like_community_id: randomCommunityId,
          status: "subscribed",
        } satisfies IRedditLikeSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Verify subscription was created successfully
  TestValidator.equals(
    "subscription status",
    subscription.status,
    "subscribed",
  );
  TestValidator.equals("subscription deletedAt", subscription.deletedAt, null);
  // 4. Store the subscription ID
  const subscriptionId = subscription.id;
  // 5. Attempt to delete the only subscription (should fail with 409 Conflict)
  await TestValidator.httpError(
    "should prevent deletion of last subscription",
    409,
    async () => {
      await api.functional.redditLike.member.subscriptions.erase(
        memberConnection,
        {
          subscriptionId,
        },
      );
    },
  );
}
