import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify behavior when a platform admin requests details for a non-existent
 * community subscription.
 *
 * Business intent:
 *
 * - Ensure that even with platformAdmin-level privileges, requesting a
 *   subscription by a bogus UUID does not return a normal
 *   ICommunityPlatformCommunitySubscription record.
 * - Confirm that the system signals an error for a missing subscription id
 *   instead of returning a successful response.
 * - Avoid any assumptions about exact HTTP status codes or error body shapes;
 *   simply ensure an error is thrown.
 *
 * Steps:
 *
 * 1. Register and authenticate a new platform admin using the join endpoint.
 * 2. Generate a random UUID to act as a non-existent subscriptionId.
 * 3. Call the platform admin subscription detail endpoint with that UUID.
 * 4. Assert that the call fails (throws) rather than returning a
 *    ICommunityPlatformCommunitySubscription.
 */
export async function test_api_platform_admin_subscription_detail_for_nonexistent_subscription(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Generate a random UUID as a bogus subscription id that should not exist.
  const nonexistentSubscriptionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Attempt to get subscription details and expect an error.
  await TestValidator.error(
    "platform admin subscription detail for non-existent subscription should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.subscriptions.at(
        connection,
        {
          subscriptionId: nonexistentSubscriptionId,
        },
      );
    },
  );
}
