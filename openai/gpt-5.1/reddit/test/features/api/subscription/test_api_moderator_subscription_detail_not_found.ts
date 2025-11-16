import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that moderator-scoped subscription detail endpoint cleanly returns
 * not-found when given a non-existent subscriptionId.
 *
 * 1. Join as a community moderator via POST /auth/communityModerator/join.
 * 2. Generate a random UUID that is extremely unlikely to match any existing
 *    subscription.
 * 3. Call GET /communityPlatform/communityModerator/subscriptions/{subscriptionId}
 *    with that UUID.
 * 4. Ensure the call fails (throws) instead of returning a subscription object.
 */
export async function test_api_moderator_subscription_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a community moderator.
  const authorizedModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: `moderator_${Date.now()}`,
        email: `moderator_${Date.now()}@example.com`,
        password: "StrongP@ssw0rd!",
        display_name: "Test Moderator",
        ip: null,
        href: "https://community.example.com/signup/moderator",
        referrer: "https://community.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(authorizedModerator);

  // 2. Generate a random UUID that should not correspond to any existing subscription.
  const missingSubscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3-4. Ensure that querying the non-existent subscriptionId results in an error.
  await TestValidator.error(
    "moderator subscription detail not found",
    async () => {
      await api.functional.communityPlatform.communityModerator.subscriptions.at(
        connection,
        {
          subscriptionId: missingSubscriptionId,
        },
      );
    },
  );
}
