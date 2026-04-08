import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_subscription_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a test community
  const communityName =
    RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(4);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe the member to the created community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Retrieve the subscription using the returned subscriptionId
  const retrievedSubscription =
    await api.functional.redditPlatform.member.subscribed.at(memberConnection, {
      subscriptionId: subscription.id,
    });
  typia.assert(retrievedSubscription);
  // 5. Validate subscription data matches expected structure and values
  TestValidator.equals(
    "subscription id matches",
    subscription.id,
    retrievedSubscription.id,
  );
  TestValidator.equals(
    "community id matches",
    subscription.community.id,
    retrievedSubscription.community.id,
  );
  TestValidator.equals(
    "community name matches",
    subscription.community.name,
    retrievedSubscription.community.name,
  );
  TestValidator.equals(
    "community description matches",
    subscription.community.description,
    retrievedSubscription.community.description,
  );
  TestValidator.equals(
    "community subscriber_count matches",
    subscription.community.subscriber_count,
    retrievedSubscription.community.subscriber_count,
  );
  TestValidator.equals(
    "community owner id matches",
    subscription.community.owner.id,
    retrievedSubscription.community.owner.id,
  );
  TestValidator.equals(
    "community owner username matches",
    subscription.community.owner.username,
    retrievedSubscription.community.owner.username,
  );
  TestValidator.equals(
    "community created_at matches",
    subscription.community.created_at,
    retrievedSubscription.community.created_at,
  );
  TestValidator.equals(
    "community updated_at matches",
    subscription.community.updated_at,
    retrievedSubscription.community.updated_at,
  );
  TestValidator.equals(
    "community deleted_at matches",
    subscription.community.deleted_at,
    retrievedSubscription.community.deleted_at,
  );
  TestValidator.equals(
    "subscription deleted_at is null",
    subscription.deleted_at,
    retrievedSubscription.deleted_at,
  );
  TestValidator.predicate(
    "subscription deleted_at indicates active",
    subscription.deleted_at === null,
  );
  TestValidator.predicate(
    "subscribed_at is valid timestamp",
    typeof subscription.subscribed_at === "string" &&
      subscription.subscribed_at!.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    typeof subscription.created_at === "string" &&
      subscription.created_at.length > 0,
  );
}
