import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Test for admin retrieval of paginated redditCommunity system configurations.
 *
 * Business context: Administrators must login through the admin join endpoint
 * to authenticate. Once authenticated, the admin can request the system
 * configuration listings, applying pagination and optional search and sorting
 * filters.
 *
 * This test validates:
 *
 * - Correct admin authentication and token issuance
 * - Proper handling of pagination parameters
 * - Effective application of search filters
 * - Accurate sorting by specified keys and order
 * - Correct response structure including pagination and configuration listings
 *
 * Steps:
 *
 * 1. Create a new admin user by calling the join API with random user ID.
 * 2. Confirm the returned admin authorization object and token validity.
 * 3. Issue a patch request to
 *    '/redditCommunity/admin/redditCommunitySystemConfigurations' with
 *    realistic pagination:
 *
 *    - Page: 1
 *    - Limit: 10
 *    - Optionally search string to filter by part of config key or value
 *    - SortKey: 'config_key'
 *    - SortOrder: 'asc'
 * 4. Assert the pagination data is consistent and response data is an array of
 *    system configurations.
 * 5. Each system configuration object is validated for proper key, value, id,
 *    timestamps, and optional description.
 */
export async function test_api_admin_system_configuration_list(
  connection: api.IConnection,
) {
  // 1. Admin join to authenticate
  const adminAdminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAdminAuthorized);

  // 2. Paginated system configuration listing request
  const requestBody = {
    page: 1,
    limit: 10,
    search: undefined,
    sortKey: "config_key",
    sortOrder: "asc",
  } satisfies IRedditCommunitySystemConfiguration.IRequest;

  const response: IPageIRedditCommunitySystemConfiguration.ISummary =
    await api.functional.redditCommunity.admin.redditCommunitySystemConfigurations.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert(response);

  // 3. Validate pagination
  TestValidator.predicate(
    "pagination.current should be equal to requested page",
    response.pagination.current === requestBody.page,
  );
  TestValidator.predicate(
    "pagination.limit should be equal to requested limit",
    response.pagination.limit === requestBody.limit,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    response.pagination.pages >= 0,
  );

  // 4. Validate data details
  for (const config of response.data) {
    typia.assert(config);
    TestValidator.predicate(
      "config.id is uuid",
      typeof config.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          config.id,
        ),
    );

    TestValidator.predicate(
      "config_key is non-empty string",
      typeof config.config_key === "string" && config.config_key.length > 0,
    );

    TestValidator.predicate(
      "config_value is string",
      typeof config.config_value === "string",
    );

    TestValidator.predicate(
      "created_at string is valid ISO 8601",
      !isNaN(Date.parse(config.created_at)),
    );
    TestValidator.predicate(
      "updated_at string is valid ISO 8601",
      !isNaN(Date.parse(config.updated_at)),
    );

    TestValidator.predicate(
      "description is string or null or undefined",
      config.description === null ||
        typeof config.description === "string" ||
        config.description === undefined,
    );
  }
}
