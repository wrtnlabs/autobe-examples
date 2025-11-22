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
 * Test Platform Administrator Settings Filtering by Public Visibility
 *
 * This test validates the platform settings search functionality with public
 * visibility filtering. It ensures that the `is_public` filter parameter
 * correctly separates public settings (visible to regular users) from private
 * settings (admin-only) for proper access control management.
 *
 * Test Flow:
 *
 * 1. Authentication Setup: Create a platform administrator account to establish
 *    proper authorization context
 * 2. Public Settings Test: Search settings with `is_public: true` filter and
 *    validate only public settings are returned
 * 3. Private Settings Test: Search settings with `is_public: false` filter and
 *    validate only private settings are returned
 * 4. Mixed Settings Test: Search settings with no `is_public` filter and validate
 *    both public and private settings are returned
 * 5. Data Integrity Validation: Ensure returned settings have correct metadata and
 *    meet filtering criteria
 *
 * Business Context: Platform administrators need to manage system-wide
 * configuration settings with different visibility levels. Public settings can
 * be accessed by regular users for informational purposes (e.g., feature flags,
 * public limits), while private settings contain sensitive configuration that
 * should only be accessible to administrators. The filtering system must
 * accurately separate these categories to maintain proper access control.
 *
 * Expected Results:
 *
 * - Public settings filtering returns only settings where `is_public = true`
 * - Private settings filtering returns only settings where `is_public = false`
 * - Unfiltered search returns all settings regardless of visibility
 * - Each returned setting contains complete metadata (key, value, description,
 *   data_type, timestamps)
 * - Pagination and sorting work correctly across different visibility filters
 */
export async function test_api_platform_settings_search_public_vs_private(
  connection: api.IConnection,
) {
  // 1. Create platform administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16) + "Aa1!",
        display_name: "Test Platform Admin",
        administrator_level: "admin",
        security_clearance: "medium",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: { can_remove_content: true },
          system_configuration: { can_manage_settings: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Test Public Settings Filter (is_public: true)
  const publicSettingsResult =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          is_public: true,
          limit: 50,
          page: 1,
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(publicSettingsResult);

  // Validate public settings response structure
  TestValidator.equals(
    "public settings response has pagination data",
    publicSettingsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "public settings response has limit applied",
    publicSettingsResult.pagination.limit,
    50,
  );

  // Validate all returned settings are public
  for (const setting of publicSettingsResult.data) {
    TestValidator.equals("setting is public", setting.is_public, true);

    // Validate required metadata fields
    TestValidator.predicate(
      "setting has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        setting.id,
      ),
    );
    TestValidator.predicate(
      "setting key is valid format",
      /^[a-zA-Z0-9_-]+$/.test(setting.key),
    );
    TestValidator.equals(
      "setting has description",
      setting.description.length > 0,
      true,
    );
    TestValidator.equals(
      "setting has valid data type",
      ["string", "number", "boolean", "json", "email"].includes(
        setting.data_type,
      ),
      true,
    );
    TestValidator.predicate(
      "setting has valid timestamps",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        setting.created_at,
      ) &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
          setting.updated_at,
        ),
    );
  }

  // 3. Test Private Settings Filter (is_public: false)
  const privateSettingsResult =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          is_public: false,
          limit: 50,
          page: 1,
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(privateSettingsResult);

  // Validate private settings response structure
  TestValidator.equals(
    "private settings response has pagination data",
    privateSettingsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "private settings response has limit applied",
    privateSettingsResult.pagination.limit,
    50,
  );

  // Validate all returned settings are private
  for (const setting of privateSettingsResult.data) {
    TestValidator.equals("setting is private", setting.is_public, false);

    // Validate required metadata fields
    TestValidator.predicate(
      "private setting has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        setting.id,
      ),
    );
    TestValidator.predicate(
      "private setting key is valid format",
      /^[a-zA-Z0-9_-]+$/.test(setting.key),
    );
    TestValidator.equals(
      "private setting has description",
      setting.description.length > 0,
      true,
    );
    TestValidator.equals(
      "private setting has valid data type",
      ["string", "number", "boolean", "json", "email"].includes(
        setting.data_type,
      ),
      true,
    );
    TestValidator.predicate(
      "private setting has valid timestamps",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        setting.created_at,
      ) &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
          setting.updated_at,
        ),
    );
  }

  // 4. Test Unfiltered Search (no is_public filter)
  const allSettingsResult =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(allSettingsResult);

  // Validate mixed settings response structure
  TestValidator.equals(
    "all settings response has pagination data",
    allSettingsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all settings response has higher limit for complete dataset",
    allSettingsResult.pagination.limit,
    100,
  );

  // Validate mixed public and private settings
  let publicCount = 0;
  let privateCount = 0;

  for (const setting of allSettingsResult.data) {
    if (setting.is_public) {
      publicCount++;
    } else {
      privateCount++;
    }

    // Validate all settings have required metadata
    TestValidator.predicate(
      "mixed setting has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        setting.id,
      ),
    );
    TestValidator.predicate(
      "mixed setting key is valid format",
      /^[a-zA-Z0-9_-]+$/.test(setting.key),
    );
    TestValidator.equals(
      "mixed setting has description",
      setting.description.length > 0,
      true,
    );
    TestValidator.equals(
      "mixed setting has valid data type",
      ["string", "number", "boolean", "json", "email"].includes(
        setting.data_type,
      ),
      true,
    );
    TestValidator.predicate(
      "mixed setting has valid timestamps",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        setting.created_at,
      ) &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
          setting.updated_at,
        ),
    );
  }

  // Verify we have both public and private settings in the unfiltered result
  TestValidator.predicate(
    "unfiltered search returns both public and private settings",
    publicCount > 0 && privateCount > 0,
  );

  // 5. Test Data Consistency - Cross-reference counts
  TestValidator.equals(
    "public settings count matches unfiltered public count",
    publicSettingsResult.data.length,
    publicCount,
  );
  TestValidator.equals(
    "private settings count matches unfiltered private count",
    privateSettingsResult.data.length,
    privateCount,
  );

  // 6. Test Pagination with Visibility Filters
  const publicSettingsPage2 =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          is_public: true,
          limit: 10,
          page: 2,
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(publicSettingsPage2);

  TestValidator.equals(
    "second page of public settings has correct page number",
    publicSettingsPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has limit applied",
    publicSettingsPage2.pagination.limit,
    10,
  );

  // Validate all settings on page 2 are also public
  for (const setting of publicSettingsPage2.data) {
    TestValidator.equals("page 2 setting is public", setting.is_public, true);
  }

  // 7. Test Sorting with Visibility Filters
  const publicSettingsByKey =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          is_public: true,
          limit: 20,
          page: 1,
          sort_by: "key",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(publicSettingsByKey);

  // Validate sorting by key (alphabetical order)
  for (let i = 1; i < publicSettingsByKey.data.length; i++) {
    TestValidator.predicate(
      "settings are sorted alphabetically by key",
      publicSettingsByKey.data[i - 1].key <= publicSettingsByKey.data[i].key,
    );
  }

  // 8. Test Search Functionality with Visibility Filter
  if (publicSettingsResult.data.length > 0) {
    const samplePublicSetting = publicSettingsResult.data[0];
    const searchKeyword = samplePublicSetting.key.substring(
      0,
      Math.min(3, samplePublicSetting.key.length),
    );

    const publicSettingsSearch =
      await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
        connection,
        {
          body: {
            is_public: true,
            search: searchKeyword,
            limit: 10,
          } satisfies IRedditPlatformSetting.IRequest,
        },
      );
    typia.assert(publicSettingsSearch);

    // All returned settings should be public and contain the search term
    for (const setting of publicSettingsSearch.data) {
      TestValidator.equals(
        "search result setting is public",
        setting.is_public,
        true,
      );
      TestValidator.predicate(
        "setting key contains search term",
        setting.key.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          setting.description
            .toLowerCase()
            .includes(searchKeyword.toLowerCase()),
      );
    }
  }
}
