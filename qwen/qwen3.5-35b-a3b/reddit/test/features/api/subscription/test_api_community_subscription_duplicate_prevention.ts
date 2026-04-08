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

export async function test_api_community_subscription_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Generate a community UUID to subscribe to
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First subscription attempt - should succeed
  const firstSubscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: communityId,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(firstSubscription);
  // Validate first subscription was created successfully
  TestValidator.equals(
    "first subscription exists",
    firstSubscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "community_id matches input",
    firstSubscription.community.id,
    communityId,
  );
  TestValidator.equals(
    "subscriber_count is 1",
    firstSubscription.community.subscriber_count,
    1,
  );
  const firstSubscriptionId = firstSubscription.id;
  const firstSubscribedAt = firstSubscription.subscribed_at;
  const firstCreatedAt = firstSubscription.created_at;
  const firstUpdatedAt = firstSubscription.updated_at;
  const firstSubscriberCount = firstSubscription.community.subscriber_count;
  // 4. Second subscription attempt to same community - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate subscription returns 409 Conflict",
    409,
    async () => {
      await api.functional.redditPlatform.member.subscriptions.create(
        memberConnection,
        {
          body: {
            community_id: communityId,
          } satisfies IRedditPlatformSubscription.ICreate,
        },
      );
    },
  );
  // 5. Verify first subscription remains unchanged after duplicate attempt
  TestValidator.equals(
    "original subscription still active (deleted_at is NULL)",
    firstSubscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "subscription id unchanged",
    firstSubscription.id,
    firstSubscriptionId,
  );
  TestValidator.equals(
    "subscribed_at unchanged",
    firstSubscription.subscribed_at,
    firstSubscribedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    firstSubscription.created_at,
    firstCreatedAt,
  );
  TestValidator.equals(
    "updated_at unchanged",
    firstSubscription.updated_at,
    firstUpdatedAt,
  );
  TestValidator.equals(
    "subscriber_count not incremented again",
    firstSubscription.community.subscriber_count,
    firstSubscriberCount,
  );
}