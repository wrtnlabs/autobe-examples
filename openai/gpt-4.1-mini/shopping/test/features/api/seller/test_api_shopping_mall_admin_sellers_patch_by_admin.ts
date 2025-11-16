import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test updating seller information by an authenticated admin user.
 *
 * This test validates that admin authentication via the join operation is
 * successful and that the admin can perform patch updates on seller data.
 *
 * The test first creates a superadmin user, then performs an update request on
 * the seller list with filtering and pagination. Finally, it validates the
 * correctness of the response including pagination fields and seller
 * summaries.
 */
export async function test_api_shopping_mall_admin_sellers_patch_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "securePassword123",
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Prepare update request body for seller index patch
  const updateRequestBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.name(2),
    status: "active",
    business_status: "approved",
  } satisfies IShoppingMallSeller.IRequest;

  // Step 3: Call the sellers patch endpoint
  const result: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: updateRequestBody,
    });
  typia.assert(result);

  // Step 4: Validate response
  TestValidator.predicate(
    "pagination is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages are positive",
    result.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("result data is array", Array.isArray(result.data));

  // Validate each seller's summary
  for (const seller of result.data) {
    typia.assert(seller);
    TestValidator.predicate(
      "seller id is UUID format",
      /^[0-9a-fA-F-]{36}$/.test(seller.id),
    );
    TestValidator.predicate(
      "seller status is valid string",
      ["active", "inactive", "suspended"].includes(seller.status),
    );
    TestValidator.predicate(
      "seller business_status is valid string",
      ["approved", "pending", "rejected"].includes(seller.business_status),
    );
  }
}
