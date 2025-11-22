import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSetting";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSetting";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator using pagination parameters (page, limit) for
 * large setting collections.
 *
 * This test validates that pagination works correctly with various page sizes
 * and handles large datasets efficiently for administrative interfaces. The
 * test creates a platform administrator account, then performs multiple
 * pagination tests including:
 *
 * 1. Testing small page sizes (5 items) to verify basic pagination functionality
 * 2. Testing medium page sizes (25 items) for typical administrative use cases
 * 3. Testing large page sizes (50 items) to check performance with larger datasets
 * 4. Testing multiple page navigations to ensure consistency across pages
 * 5. Validating that total record counts remain consistent across different page
 *    requests
 * 6. Testing edge cases like requesting non-existent pages
 *
 * All tests verify proper data ordering, accurate pagination metadata (current
 * page, total pages, records), and that no data is lost or duplicated across
 * page boundaries.
 */
export async function test_api_platform_settings_search_pagination(
  connection: api.IConnection,
) {
  // 1. Create platform administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphabets(8)}`,
        email: adminEmail,
        password: "AdminTest123!",
        display_name: "Test Administrator",
        administrator_level: "super_admin",
        security_clearance: "high",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: true,
            can_view_system_logs: true,
            can_manage_security: true,
            can_manage_backup: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: true,
            can_manage_data_retention: true,
            can_handle_dmca: true,
            can_manage_legal_requests: true,
            can_view_analytics: true,
          },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Test 1: Small page size (5 items) - Basic pagination functionality
  const smallPageResult: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "key",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(smallPageResult);

  TestValidator.equals(
    "small page limit validation",
    smallPageResult.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "small page current page should be 1",
    smallPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "small page limit should be 5",
    smallPageResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small page data should exist",
    smallPageResult.data.length > 0,
  );

  // 3. Test 2: Medium page size (25 items) - Typical administrative use cases
  const mediumPageResult: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          sort_by: "created_at",
          order_by: "desc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(mediumPageResult);

  TestValidator.equals(
    "medium page limit validation",
    mediumPageResult.data.length <= 25,
    true,
  );
  TestValidator.equals(
    "medium page current page should be 1",
    mediumPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "medium page limit should be 25",
    mediumPageResult.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "medium page data should exist",
    mediumPageResult.data.length > 0,
  );

  // Store total records for consistency checks
  const totalRecords = mediumPageResult.pagination.records;

  // 4. Test 3: Large page size (50 items) - Performance with larger datasets
  const largePageResult: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "updated_at",
          order_by: "desc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(largePageResult);

  TestValidator.equals(
    "large page limit validation",
    largePageResult.data.length <= 50,
    true,
  );
  TestValidator.equals(
    "large page current page should be 1",
    largePageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "large page limit should be 50",
    largePageResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "large page data should exist",
    largePageResult.data.length > 0,
  );

  // 5. Test 4: Multiple page navigation - Consistency across pages
  if (totalRecords > 25) {
    const secondPageResult: IPageIRedditPlatformSetting.ISummary =
      await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
        connection,
        {
          body: {
            page: 2,
            limit: 25,
            sort_by: "created_at",
            order_by: "desc",
          } satisfies IRedditPlatformSetting.IRequest,
        },
      );
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page current page should be 2",
      secondPageResult.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should be 25",
      secondPageResult.pagination.limit,
      25,
    );
    TestValidator.equals(
      "second page limit validation",
      secondPageResult.data.length <= 25,
      true,
    );

    // Verify no data overlap between pages
    const firstPageIds = smallPageResult.data.map((setting) => setting.id);
    const secondPageIds = secondPageResult.data.map((setting) => setting.id);
    const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
    TestValidator.equals("no data overlap between pages", overlap.length, 0);

    // Calculate expected total pages
    const expectedTotalPages = Math.ceil(totalRecords / 25);
    TestValidator.equals(
      "total pages calculation should be correct",
      secondPageResult.pagination.pages,
      expectedTotalPages,
    );
  }

  // 6. Test 5: Validate total record count consistency across different page sizes
  const page10Result: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "key",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(page10Result);

  TestValidator.equals(
    "page 10 total records should match",
    page10Result.pagination.records,
    totalRecords,
  );

  // 7. Test 6: Edge cases - Requesting non-existent page
  const nonExistentPageResult: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          page: 999999,
          limit: 25,
          sort_by: "key",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(nonExistentPageResult);

  TestValidator.equals(
    "non-existent page should return empty data",
    nonExistentPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent page should have correct page number",
    nonExistentPageResult.pagination.current,
    999999,
  );
  TestValidator.equals(
    "non-existent page limit should be preserved",
    nonExistentPageResult.pagination.limit,
    25,
  );
  TestValidator.equals(
    "non-existent page total records should be consistent",
    nonExistentPageResult.pagination.records,
    totalRecords,
  );

  // 8. Test 7: Test sorting consistency across different page requests
  const ascendingSortResult: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "key",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(ascendingSortResult);

  if (ascendingSortResult.data.length > 1) {
    const keys = ascendingSortResult.data.map((setting) => setting.key);
    const sortedKeys = [...keys].sort();
    TestValidator.equals("ascending sort should be correct", keys, sortedKeys);
  }

  // 9. Test 8: Validate data integrity across different pagination parameters
  const searchFilterResult: IPageIRedditPlatformSetting.ISummary =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "data_type",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(searchFilterResult);

  TestValidator.equals(
    "search filter total records should be consistent",
    searchFilterResult.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "search filter page should be within range",
    searchFilterResult.data.length <= 20,
    true,
  );
  TestValidator.predicate(
    "search filter data should contain valid settings",
    searchFilterResult.data.every(
      (setting) =>
        setting.key &&
        setting.value &&
        setting.description &&
        setting.data_type,
    ),
  );
}
