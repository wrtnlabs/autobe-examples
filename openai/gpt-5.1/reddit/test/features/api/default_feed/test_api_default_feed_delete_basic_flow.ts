import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can delete a default feed
 * configuration by its business `feed_code` and that subsequent deletion
 * attempts fail.
 *
 * Business context:
 *
 * - Default feed configurations are stored in `community_platform_default_feeds`
 *   and are addressed by a business identifier `feed_code` rather than an
 *   internal id.
 * - Platform admins manage these configurations through administrative APIs.
 *
 * This test exercises the basic happy path plus an error scenario:
 *
 * 1. Register (join) a new platform admin to obtain an authenticated context.
 * 2. Create a new default feed configuration via the admin API.
 * 3. Delete the created configuration using its `feed_code`.
 * 4. Attempt to delete the same `feed_code` again and verify that it now fails.
 */
export async function test_api_default_feed_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to get an authenticated admin context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    // ip is optional in IJoin; omit it for simplicity.
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new default feed configuration as that admin.
  // Use a deterministic-ish feed_code to make assertions clearer.
  const feedCode = `default-feed-${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    feed_code: feedCode,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const createdFeed: ICommunityPlatformDefaultFeed =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdFeed);

  // Validate that the created feed echoes back the requested feed_code.
  TestValidator.equals(
    "created default feed should have the same feed_code as requested",
    createdFeed.feed_code,
    feedCode,
  );

  // 3. Delete the created default feed configuration by its business feed_code.
  await api.functional.communityPlatform.platformAdmin.defaultFeeds.erase(
    connection,
    { feedCode: createdFeed.feed_code },
  );

  // If no error is thrown, deletion is considered successful.
  TestValidator.predicate(
    "first deletion by feed_code completes without throwing",
    true,
  );

  // 4. Attempt to delete the same feedCode again and expect an error.
  await TestValidator.error(
    "second deletion attempt for the same feed_code should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.erase(
        connection,
        { feedCode: createdFeed.feed_code },
      );
    },
  );
}
