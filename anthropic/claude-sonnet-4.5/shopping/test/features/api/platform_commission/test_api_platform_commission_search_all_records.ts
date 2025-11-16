import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";

/**
 * Test retrieving all platform commission records with basic pagination and no
 * filters.
 *
 * This test validates the fundamental commission listing functionality for
 * administrators to view complete commission revenue history without any
 * filtering criteria applied.
 *
 * Test workflow:
 *
 * 1. Authenticate as platform administrator
 * 2. Send commission search request with only pagination parameters
 * 3. Validate response structure and pagination metadata
 * 4. Verify default sort order (created_at descending)
 */
export async function test_api_platform_commission_search_all_records(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Send search request with basic pagination only (no filters)
  const searchRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const response: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);

  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    response.pagination.pages >= 0,
  );

  // Step 4: Validate default sort order (created_at descending - newest first)
  if (response.data.length > 1) {
    const firstRecord = response.data[0];
    const secondRecord = response.data[1];
    typia.assert(firstRecord);
    typia.assert(secondRecord);

    const firstDate = new Date(firstRecord.created_at);
    const secondDate = new Date(secondRecord.created_at);

    TestValidator.predicate(
      "records are sorted by created_at descending (newest first)",
      firstDate >= secondDate,
    );
  }
}
