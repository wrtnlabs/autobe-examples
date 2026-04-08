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
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_subscription } from "../../../prepare/prepare_random_reddit_platform_subscription";

export async function test_api_community_subscription_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Update connection headers with auth token (required for subsequent API calls)
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Use an existing community (generate valid UUID for testing)
  // In production, this would retrieve from /redditPlatform/communities
  const existingCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create subscription
  const subscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: existingCommunityId,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Validate subscription response structure
  TestValidator.equals(
    "subscription id exists",
    subscription.id !== undefined,
    true,
  );
  TestValidator.equals(
    "subscription user_id matches member",
    subscription.user.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "subscription community_id matches",
    subscription.community.id,
    existingCommunityId,
  );
  TestValidator.equals(
    "subscribed_at timestamp set",
    subscription.subscribed_at !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at timestamp set",
    subscription.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at timestamp set",
    subscription.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is NULL (active)",
    subscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "user username matches member",
    subscription.user.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "user karma exists",
    subscription.user.karma !== undefined,
    true,
  );
  TestValidator.equals(
    "user created_at exists",
    subscription.user.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "community name exists",
    subscription.community.name.length > 0,
    true,
  );
  TestValidator.predicate(
    "community subscriber_count >= 1",
    subscription.community.subscriber_count >= 1,
  );
  TestValidator.equals(
    "community created_at exists",
    subscription.community.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "community updated_at exists",
    subscription.community.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "community deleted_at is NULL",
    subscription.community.deleted_at,
    null,
  );
}