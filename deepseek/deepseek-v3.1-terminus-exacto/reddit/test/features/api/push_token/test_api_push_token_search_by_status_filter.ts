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
 * Test push token filtering by operational status for proactive token
 * management.
 *
 * Validates that administrators can filter tokens by status (active, expired,
 * invalid) to identify tokens requiring maintenance, renewal, or cleanup
 * actions, ensuring optimal notification delivery reliability and system
 * performance.
 */
export async function test_api_push_token_search_by_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test filtering by each token status
  const statuses = ["active", "expired", "invalid"] as const;

  for (const status of statuses) {
    // Test search with specific status filter
    const searchResult: IPageICommunityPlatformPushToken.ISummary =
      await api.functional.communityPlatform.admin.pushTokens.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            token_status: status,
          } satisfies ICommunityPlatformPushToken.IRequest,
        },
      );
    typia.assert(searchResult);

    // Validate pagination structure
    TestValidator.equals(
      `pagination structure for ${status} filter`,
      searchResult.pagination,
      {
        current: 1,
        limit: 10,
        records: searchResult.pagination.records,
        pages: Math.ceil(searchResult.pagination.records / 10),
      } satisfies IPage.IPagination,
    );

    // Validate that all returned tokens have the requested status
    TestValidator.predicate(
      `all tokens should have ${status} status`,
      searchResult.data.every((token) => token.token_status === status),
    );

    // Validate token summary structure
    for (const token of searchResult.data) {
      typia.assert(token);
      TestValidator.predicate(
        `token ${token.id} has valid platform`,
        token.platform === "ios" || token.platform === "android",
      );
      TestValidator.predicate(
        `token ${token.id} has device token`,
        token.device_token.length > 0,
      );
    }
  }

  // Step 3: Test search without status filter (should return all tokens)
  const allTokensResult: IPageICommunityPlatformPushToken.ISummary =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(allTokensResult);

  TestValidator.equals(
    "pagination structure for unfiltered search",
    allTokensResult.pagination,
    {
      current: 1,
      limit: 5,
      records: allTokensResult.pagination.records,
      pages: Math.ceil(allTokensResult.pagination.records / 5),
    } satisfies IPage.IPagination,
  );

  // Step 4: Test combination of status filter with other parameters
  const combinedSearchResult: IPageICommunityPlatformPushToken.ISummary =
    await api.functional.communityPlatform.admin.pushTokens.index(connection, {
      body: {
        page: 1,
        limit: 3,
        token_status: "active",
        platform: "ios",
        order_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformPushToken.IRequest,
    });
  typia.assert(combinedSearchResult);

  TestValidator.predicate(
    "combined search returns active iOS tokens",
    combinedSearchResult.data.every(
      (token) => token.token_status === "active" && token.platform === "ios",
    ),
  );
}
