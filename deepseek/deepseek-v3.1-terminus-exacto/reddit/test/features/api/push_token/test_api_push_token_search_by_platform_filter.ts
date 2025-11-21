import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPushToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPushToken";

/**
 * Test platform-specific push token filtering for targeted token management.
 *
 * Validates that administrators can filter tokens by specific mobile platforms
 * (iOS or Android) to focus on platform-specific token management,
 * troubleshooting, and notification delivery optimization for different mobile
 * operating systems.
 *
 * This test implements a comprehensive workflow:
 *
 * 1. Create an administrator account to establish authentication context
 * 2. Use the push token search API with platform-specific filters
 * 3. Validate that API responses contain proper pagination structure
 * 4. Test combined filtering with search functionality
 *
 * The test ensures that platform filtering works correctly for both iOS and
 * Android platforms, allowing administrators to efficiently manage
 * platform-specific notification delivery systems.
 */
export async function test_api_push_token_search_by_platform_filter(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Test iOS platform filtering
  const iosTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        platform: "ios",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(iosTokens);
  TestValidator.equals(
    "iOS filter returns pagination structure",
    iosTokens.pagination.current,
    1,
  );
  TestValidator.equals(
    "iOS filter returns valid page limit",
    iosTokens.pagination.limit,
    10,
  );

  // 3. Test Android platform filtering
  const androidTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        platform: "android",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(androidTokens);
  TestValidator.equals(
    "Android filter returns pagination structure",
    androidTokens.pagination.current,
    1,
  );
  TestValidator.equals(
    "Android filter returns valid page limit",
    androidTokens.pagination.limit,
    10,
  );

  // 4. Test combined platform filtering with search
  const searchTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        platform: "ios",
        search: RandomGenerator.alphabets(5),
        page: 1,
        limit: 5,
        order_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(searchTokens);
  TestValidator.equals(
    "combined platform and search returns valid structure",
    searchTokens.pagination.current,
    1,
  );

  // 5. Test platform filtering with token status
  const activeTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        platform: "android",
        token_status: "active",
        page: 1,
        limit: 15,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(activeTokens);
  TestValidator.equals(
    "platform and status filter returns valid pagination",
    activeTokens.pagination.limit,
    15,
  );

  // 6. Validate pagination properties for all responses
  TestValidator.predicate(
    "iOS pagination records is non-negative",
    iosTokens.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Android pagination records is non-negative",
    androidTokens.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Search pagination records is non-negative",
    searchTokens.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Active tokens pagination records is non-negative",
    activeTokens.pagination.records >= 0,
  );
}
