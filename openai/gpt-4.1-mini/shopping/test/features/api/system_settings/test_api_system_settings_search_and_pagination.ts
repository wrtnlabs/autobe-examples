import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemSetting";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";

/**
 * This E2E test perform a complete scenario to test the retrieval of system
 * settings with filters and pagination functionalities via the PATCH
 * /shoppingMall/admin/systemSettings API.
 *
 * The test first authenticates as an admin user by calling the join operation
 * on the /auth/admin/join endpoint, which issues a JWT token for admin
 * authorization. Next, the test creates several distinct system settings using
 * the POST /shoppingMall/admin/systemSettings API to set up data for the search
 * test. After creating these system settings, the test performs a paginated
 * search request to the PATCH endpoint, applying filters such as active status
 * (deleted_at null), key and value matching or full-text search. The test
 * validates that only active, non-soft-deleted system settings appear in the
 * search results, and that the pagination metadata matches expected values. It
 * also confirms that the returned system setting summaries contain necessary
 * properties (id, key, value, description, timestamps). The test ensures proper
 * type assertions on each API response object, and comprehensive validation on
 * pagination counts and data integrity. This test confirms the correctness of
 * admin system settings listing capabilities including filtering and pagination
 * behavior.
 */
export async function test_api_system_settings_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user join (authentication)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create multiple system settings for search test
  const keysToCreate = [
    "site_title",
    "welcome_message",
    "max_users",
    "enable_feature_x",
  ] as const;
  const createdSettings: IShoppingMallSystemSetting[] = [];

  for (const key of keysToCreate) {
    const value =
      key === "site_title"
        ? "Example Shopping Mall"
        : key === "welcome_message"
          ? "Welcome to our awesome store!"
          : key === "max_users"
            ? "5000"
            : "true";

    const description =
      key === "site_title"
        ? "The title of the shopping mall site displayed on the header"
        : key === "welcome_message"
          ? "The welcome message shown on the homepage"
          : key === "max_users"
            ? "Maximum concurrent users allowed"
            : "Feature X toggle flag";

    const created: IShoppingMallSystemSetting =
      await api.functional.shoppingMall.admin.systemSettings.create(
        connection,
        {
          body: {
            key,
            value,
            description,
          } satisfies IShoppingMallSystemSetting.ICreate,
        },
      );
    typia.assert(created);
    createdSettings.push(created);
  }

  // 3. Search with pagination and filtering active settings only
  const searchRequest: IShoppingMallSystemSetting.IRequest = {
    page: 1,
    limit: 10,
    search: "",
  };

  const pageResult: IPageIShoppingMallSystemSetting.ISummary =
    await api.functional.shoppingMall.admin.systemSettings.index(connection, {
      body: searchRequest,
    });
  typia.assert(pageResult);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    pageResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 10",
    pageResult.pagination.limit === 10,
  );

  TestValidator.predicate(
    "pagination records count is at least number of created settings",
    pageResult.pagination.records >= createdSettings.length,
  );

  TestValidator.predicate(
    "pagination pages is correct",
    pageResult.pagination.pages >= 1,
  );

  // 5. Validate all returned settings have non-null deleted_at
  for (const setting of pageResult.data) {
    typia.assert(setting);
    TestValidator.predicate(
      `setting deleted_at is null for key: ${setting.key}`,
      setting.deleted_at === null || setting.deleted_at === undefined,
    );
  }

  // 6. Validate that created settings are included in search results
  for (const created of createdSettings) {
    const found = pageResult.data.find((entry) => entry.id === created.id);
    TestValidator.predicate(
      `created setting is present with key ${created.key}`,
      found !== undefined,
    );

    if (found) {
      TestValidator.equals(
        `key matches for setting id ${created.id}`,
        found.key,
        created.key,
      );
      TestValidator.equals(
        `value matches for setting id ${created.id}`,
        found.value,
        created.value,
      );
      TestValidator.equals(
        `description matches for setting id ${created.id}`,
        found.description,
        created.description ?? null,
      );
    }
  }
}
