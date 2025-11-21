import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserBan";

/**
 * Test pagination functionality for user ban searches.
 *
 * This E2E test validates that the admin ban search interface correctly handles
 * pagination with various page sizes and navigation scenarios. It ensures that
 * pagination metadata (current page, total pages, record counts) is accurate
 * and consistent across page transitions.
 */
export async function test_api_user_ban_search_admin_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple ban records for testing pagination
  const banCount = 15; // Create enough records to test multiple pages
  const createdBans: ICommunityPlatformUserBan[] = [];

  // Define valid ban types and scopes with const assertions
  const banTypes = [
    "temporary",
    "permanent",
    "feature_restriction",
    "community_ban",
    "platform_ban",
  ] as const;
  const banScopes = ["community", "platform", "specific_features"] as const;

  for (let i = 0; i < banCount; i++) {
    const banType = RandomGenerator.pick(banTypes);
    const banScope = RandomGenerator.pick(banScopes);

    const ban: ICommunityPlatformUserBan =
      await api.functional.communityPlatform.admin.userBans.create(connection, {
        body: {
          community_platform_member_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          ban_type: banType,
          ban_scope: banScope,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          duration_hours:
            i % 3 === 0
              ? typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()
              : undefined,
          max_appeals: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          appeal_deadline:
            i % 2 === 0
              ? new Date(Date.now() + 86400000).toISOString()
              : undefined,
        } satisfies ICommunityPlatformUserBan.ICreate,
      });
    typia.assert(ban);
    createdBans.push(ban);
  }

  // Step 3: Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;

  for (const pageSize of pageSizes) {
    // Calculate expected total pages
    const expectedTotalPages = Math.ceil(banCount / pageSize);

    // Test each page
    for (let pageNumber = 1; pageNumber <= expectedTotalPages; pageNumber++) {
      const searchResult: IPageICommunityPlatformUserBan.ISummary =
        await api.functional.communityPlatform.admin.userBans.index(
          connection,
          {
            body: {
              page: pageNumber satisfies number as number,
              limit: pageSize satisfies number as number,
            } satisfies ICommunityPlatformUserBan.IRequest,
          },
        );
      typia.assert(searchResult);

      // Validate pagination metadata
      TestValidator.equals(
        `page ${pageNumber} current page matches request`,
        searchResult.pagination.current,
        pageNumber,
      );

      TestValidator.equals(
        `page ${pageNumber} limit matches request`,
        searchResult.pagination.limit,
        pageSize,
      );

      TestValidator.equals(
        `page ${pageNumber} total records matches created bans`,
        searchResult.pagination.records,
        banCount,
      );

      TestValidator.equals(
        `page ${pageNumber} total pages calculation is correct`,
        searchResult.pagination.pages,
        expectedTotalPages,
      );

      // Validate data count matches expected for the page
      const expectedDataCount =
        pageNumber === expectedTotalPages
          ? banCount - pageSize * (expectedTotalPages - 1)
          : pageSize;

      TestValidator.equals(
        `page ${pageNumber} data count matches expected`,
        searchResult.data.length,
        expectedDataCount,
      );
    }
  }

  // Step 4: Test boundary conditions
  // Test minimum page size
  const minPageSizeResult: IPageICommunityPlatformUserBan.ISummary =
    await api.functional.communityPlatform.admin.userBans.index(connection, {
      body: {
        page: 1 satisfies number as number,
        limit: 1 satisfies number as number,
      } satisfies ICommunityPlatformUserBan.IRequest,
    });
  typia.assert(minPageSizeResult);

  TestValidator.equals(
    "minimum page size returns single record",
    minPageSizeResult.data.length,
    1,
  );

  // Test maximum page size
  const maxPageSizeResult: IPageICommunityPlatformUserBan.ISummary =
    await api.functional.communityPlatform.admin.userBans.index(connection, {
      body: {
        page: 1 satisfies number as number,
        limit: 100 satisfies number as number,
      } satisfies ICommunityPlatformUserBan.IRequest,
    });
  typia.assert(maxPageSizeResult);

  TestValidator.equals(
    "maximum page size returns all records on single page",
    maxPageSizeResult.pagination.pages,
    1,
  );

  // Test page beyond total pages (should return empty data)
  const beyondPageResult: IPageICommunityPlatformUserBan.ISummary =
    await api.functional.communityPlatform.admin.userBans.index(connection, {
      body: {
        page: 100 satisfies number as number, // Far beyond actual pages
        limit: 5 satisfies number as number,
      } satisfies ICommunityPlatformUserBan.IRequest,
    });
  typia.assert(beyondPageResult);

  TestValidator.equals(
    "page beyond total pages returns empty data",
    beyondPageResult.data.length,
    0,
  );

  // Validate pagination consistency across different searches
  const firstPageSmall: IPageICommunityPlatformUserBan.ISummary =
    await api.functional.communityPlatform.admin.userBans.index(connection, {
      body: {
        page: 1 satisfies number as number,
        limit: 5 satisfies number as number,
      } satisfies ICommunityPlatformUserBan.IRequest,
    });
  typia.assert(firstPageSmall);

  const firstPageLarge: IPageICommunityPlatformUserBan.ISummary =
    await api.functional.communityPlatform.admin.userBans.index(connection, {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformUserBan.IRequest,
    });
  typia.assert(firstPageLarge);

  TestValidator.equals(
    "total records consistent across different page sizes",
    firstPageSmall.pagination.records,
    firstPageLarge.pagination.records,
  );
}
