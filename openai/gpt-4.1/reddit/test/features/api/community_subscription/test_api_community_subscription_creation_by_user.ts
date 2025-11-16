import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates the successful subscription of a user to a community, ensuring
 * correct workflow, business logic, and error prevention.
 *
 * 1. Registers a new user to acquire authentication context.
 * 2. Creates a new community owned by the authenticated user.
 * 3. Subscribes the user to the created community; asserts subscription record is
 *    correct and audit fields populated.
 * 4. Attempts duplicate subscription; should fail by business constraint.
 */
export async function test_api_community_subscription_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Create community as the authenticated user
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    display_title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "archived",
      "banned",
      "pending approval",
    ] as const),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Subscribe to the created community
  const subscriptionBody = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);

  // Assert that associated user/ community id are correct
  TestValidator.equals(
    "subscription user id matches logged in user",
    subscription.user.id,
    user.id,
  );
  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );

  // 4. Audit/timestamp fields are set (created_at/updated_at must be ISO8601, deleted_at must be null or undefined)
  TestValidator.predicate(
    "subscription.created_at is valid ISO date-time",
    !!subscription.created_at && !isNaN(Date.parse(subscription.created_at)),
  );
  TestValidator.predicate(
    "subscription.updated_at is valid ISO date-time",
    !!subscription.updated_at && !isNaN(Date.parse(subscription.updated_at)),
  );
  TestValidator.equals(
    "subscription.deleted_at is null or undefined",
    subscription.deleted_at,
    null,
  );

  // 5. Attempt duplicate subscription (should fail on business constraint)
  await TestValidator.error(
    "duplicate community subscription should fail",
    async () => {
      await api.functional.communityPlatform.user.communitySubscriptions.create(
        connection,
        { body: subscriptionBody },
      );
    },
  );
}
