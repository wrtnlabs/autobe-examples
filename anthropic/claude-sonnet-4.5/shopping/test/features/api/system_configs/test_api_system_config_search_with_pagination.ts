import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test system configuration search with pagination parameters.
 *
 * This test validates the pagination functionality of the system configuration
 * search endpoint. It creates an admin account for authentication, then
 * performs a search operation with specific pagination parameters to verify
 * that the API correctly returns paginated results with proper metadata.
 *
 * Test steps:
 *
 * 1. Create and authenticate as an admin user
 * 2. Execute system config search with pagination parameters (page and limit)
 * 3. Validate the response structure with typia.assert
 * 4. Verify pagination metadata values (current, limit, records, pages)
 * 5. Ensure the data array respects the limit constraint
 */
export async function test_api_system_config_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Execute system config search with pagination parameters
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;

  const searchRequest = {
    page: page,
    limit: limit,
  } satisfies IShoppingMallSystemConfig.IRequest;

  const result = await api.functional.shoppingMall.admin.systemConfigs.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(result);

  // Step 3: Verify pagination metadata values match request
  TestValidator.equals(
    "pagination current page matches request",
    result.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    result.pagination.pages >= 0,
  );

  // Step 4: Ensure the data array respects the limit constraint
  TestValidator.predicate(
    "data array length should not exceed limit",
    result.data.length <= limit,
  );
}
