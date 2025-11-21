import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_list_filter_combined_name_status(
  connection: api.IConnection,
) {
  // Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin1234",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Search with combined filter: business name contains non-existent term and status is active
  // This tests that the endpoint properly accepts and applies both filter parameters together
  // even when no matching records exist
  const searchResult: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
      body: {
        business_name: "NonExistentBusinessName", // Valid string format but non-existent value
        status: "active", // Valid status value
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(searchResult);

  // Verify the response structure is correct
  TestValidator.equals(
    "should return 0 records for non-existent combination",
    searchResult.pagination.records,
    0,
  );

  // Verify the data array is empty
  TestValidator.equals(
    "should have empty data array",
    searchResult.data.length,
    0,
  );

  // Verify pagination is correct for empty result
  TestValidator.equals(
    "should have correct pagination values for empty result",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "should have correct limit value",
    searchResult.pagination.limit,
    10,
  ); // Default limit from Pagination

  TestValidator.equals(
    "should have correct page count for empty result",
    searchResult.pagination.pages,
    0,
  );

  // Test with a different combination that might exist in system
  // Using status 'rejected' which is also a valid value in IRequest
  const searchResult2: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.actors.sellers.index(connection, {
      body: {
        business_name: "",
        status: "rejected",
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(searchResult2);

  // Verify structure is preserved
  TestValidator.equals(
    "should return 0 records for non-existent status combination",
    searchResult2.pagination.records,
    0,
  );

  // Verify the response structure matches schema exactly
  TestValidator.predicate(
    "response contains required IPageIShoppingMallSeller structure",
    searchResult.data.length === 0 &&
      typeof searchResult.pagination === "object" &&
      searchResult.pagination.current > 0 &&
      searchResult.pagination.limit > 0 &&
      searchResult.pagination.records === 0 &&
      searchResult.pagination.pages >= 0,
  );
}
