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
 * Comprehensive test for push token search functionality available to platform
 * administrators. This test validates that administrators can search and filter
 * push tokens with various criteria including platform type (iOS/Android),
 * token status (active/expired/invalid), device model filtering, app version
 * matching, and expiration date ranges.
 */
export async function test_api_push_token_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Test basic search with default pagination
  const basicSearchResult =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(basicSearchResult);
  await TestValidator.equals(
    "pagination structure present",
    1,
    basicSearchResult.pagination.current,
  );
  await TestValidator.predicate(
    "limit is valid",
    basicSearchResult.pagination.limit <= 100,
  );

  // 3. Test platform-specific filtering
  const iosTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        platform: "ios",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(iosTokens);

  const androidTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        platform: "android",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(androidTokens);

  // 4. Test token status filtering
  const activeTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        token_status: "active",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(activeTokens);

  const expiredTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        token_status: "expired",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(expiredTokens);

  const invalidTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        token_status: "invalid",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(invalidTokens);

  // 5. Test device model and app version filtering
  const deviceModelSearch =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        device_model: "iPhone",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(deviceModelSearch);

  const appVersionSearch =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        app_version: "1.0",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(appVersionSearch);

  // 6. Test date range filtering
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const dateFilteredTokens =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        expires_at: futureDate,
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(dateFilteredTokens);

  // 7. Test sorting functionality
  const createdAtSorted =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        order_by: "created_at",
        order: "desc",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(createdAtSorted);

  const lastUsedSorted =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        order_by: "last_used_at",
        order: "asc",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(lastUsedSorted);

  // 8. Test search term functionality
  const searchTermResult =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        search: "model",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(searchTermResult);

  // 9. Validate comprehensive response structure
  await TestValidator.predicate(
    "pagination object exists",
    basicSearchResult.pagination !== undefined,
  );
  await TestValidator.predicate(
    "data array exists",
    Array.isArray(basicSearchResult.data),
  );
  await TestValidator.equals(
    "pagination current page",
    1,
    basicSearchResult.pagination.current,
  );
  await TestValidator.predicate(
    "pagination limit is positive",
    basicSearchResult.pagination.limit > 0,
  );
  await TestValidator.predicate(
    "pagination records is non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination pages is non-negative",
    basicSearchResult.pagination.pages >= 0,
  );
}
