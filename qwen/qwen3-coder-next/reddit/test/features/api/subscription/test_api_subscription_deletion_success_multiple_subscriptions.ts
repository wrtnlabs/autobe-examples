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

export async function test_api_subscription_deletion_success_multiple_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create member subscription to 3 different communities
  const communities: IRedditLikeSubscription[] = [];
  for (let i = 0; i < 3; i++) {
    const community =
      await generate_random_reddit_like_member_subscriptions_create(
        memberConnection,
        {
          body: {
            reddit_like_member_id: member.id,
            reddit_like_community_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            status: "subscribed",
          } satisfies IRedditLikeSubscription.ICreate,
        },
      );
    communities.push(community);
  }
  // 3. Verify all subscriptions are active
  TestValidator.equals("all subscriptions created", communities.length, 3);
  for (const subscription of communities) {
    typia.assert(subscription);
    TestValidator.equals(
      "subscription active",
      subscription.status,
      "subscribed",
    );
    TestValidator.equals(
      "subscription not deleted",
      subscription.deletedAt,
      null,
    );
  }
  // 4. Delete one subscription (the third one)
  await api.functional.redditLike.member.subscriptions.erase(memberConnection, {
    subscriptionId: communities[2].id,
  });
  // 5. Verify other subscriptions remain active
  for (let i = 0; i < 2; i++) {
    TestValidator.equals(
      `subscription ${i} still active`,
      communities[i].status,
      "subscribed",
    );
    TestValidator.equals(
      `subscription ${i} not deleted`,
      communities[i].deletedAt,
      null,
    );
  }
  // 6. Verify deleted subscription count
  TestValidator.equals("remaining active subscriptions", communities.length, 3);
}
