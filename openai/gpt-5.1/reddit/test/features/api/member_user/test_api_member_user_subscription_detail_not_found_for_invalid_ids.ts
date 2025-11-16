import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that subscription detail lookups do not succeed for invalid or
 * inconsistent identifiers.
 *
 * Business intent:
 *
 * - When a member user asks for the details of a specific community subscription,
 *   the backend must only return a record when the (memberUserId,
 *   subscriptionId) pair actually exists.
 * - For any random or mismatched subscriptionId, the backend must respond with an
 *   error (typically a 404-style not found or access denied), without leaking
 *   details about other users' subscriptions.
 *
 * End-to-end flow covered by this test:
 *
 * 1. Register (join) a first member user and obtain an authenticated context.
 * 2. Using that member's id, try to retrieve a subscription by a random UUID that
 *    does not correspond to any subscription for this user and assert that the
 *    call fails.
 * 3. Register a second member user to represent a different account in the same
 *    environment.
 * 4. Using the second member's id, again call the subscription detail endpoint
 *    with another random subscription UUID and assert that the call fails.
 *
 * Notes and limitations:
 *
 * - The current SDK surface does not expose any API for creating or listing
 *   subscriptions, so we cannot construct a "real" subscriptionId. Instead, we
 *   rely on randomly generated UUIDs as clearly non-existent identifiers in the
 *   test database.
 * - We must not assert on concrete HTTP status codes; we only verify that the SDK
 *   call throws, using TestValidator.error.
 * - Authentication headers are managed automatically by the join endpoint; this
 *   test never manipulates connection.headers directly.
 */
export async function test_api_member_user_subscription_detail_not_found_for_invalid_ids(
  connection: api.IConnection,
) {
  // 1. Register the first member user and obtain authenticated context.
  const firstJoinRequest = {
    username: RandomGenerator.alphabets(16),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const firstAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: firstJoinRequest,
    });
  typia.assert(firstAuthorized);

  // 2. Attempt to read a subscription with a random, non-existent subscriptionId.
  const nonexistentSubscriptionIdForFirst = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "subscription detail should fail for non-existent subscription of first member user",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.at(
        connection,
        {
          memberUserId: firstAuthorized.id,
          subscriptionId: nonexistentSubscriptionIdForFirst,
        },
      );
    },
  );

  // 3. Register a second member user.
  const secondJoinRequest = {
    username: RandomGenerator.alphabets(16),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const secondAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondJoinRequest,
    });
  typia.assert(secondAuthorized);

  // 4. For the second member user, also attempt to read with a non-existent subscriptionId.
  const nonexistentSubscriptionIdForSecond = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "subscription detail should fail for non-existent subscription of second member user",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.at(
        connection,
        {
          memberUserId: secondAuthorized.id,
          subscriptionId: nonexistentSubscriptionIdForSecond,
        },
      );
    },
  );
}
