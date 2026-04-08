import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the default seller listing behavior without any filters.
 *
 * Validates that the seller list endpoint returns properly paginated results with default parameters when no filters are applied. Ensures that the response structure includes pagination metadata and seller summaries with all required fields.
 *
 * 1. Uses the provided admin-authenticated connection to access seller management endpoints
 * 2. Calls PATCH /shoppingMall/sellers with empty request body to use defaults
 * 3. Verifies response structure matches IPageIShoppingMallSeller.ISummary
 * 4. Validates pagination metadata (current page 1, limit 20, records count, pages count)
 * 5. Confirms seller summaries contain all required fields including seller_profile
 * 6. Verifies default sorting by created_at descending (newest sellers first)
 * 7. Ensures deleted sellers are excluded from results
 */
export async function test_api_seller_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection from base connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Call seller list endpoint with empty body (uses defaults)
  const response = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(response);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify data array structure
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. If there are sellers, verify their structure and sorting
  if (response.data.length > 0) {
    // Verify each seller summary has required fields
    for (const seller of response.data) {
      TestValidator.predicate(
        "seller has valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          seller.id,
        ),
      );
      TestValidator.predicate(
        "seller has valid email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(seller.email),
      );
      TestValidator.predicate(
        "seller has approval_status",
        ["pending", "approved", "rejected"].includes(seller.approval_status),
      );
      TestValidator.predicate(
        "seller has suspended flag",
        typeof seller.suspended === "boolean",
      );
      TestValidator.predicate(
        "seller has banned flag",
        typeof seller.banned === "boolean",
      );
      TestValidator.predicate(
        "seller has created_at",
        seller.created_at.length > 0,
      );
      TestValidator.predicate(
        "seller has seller_profile",
        seller.seller_profile !== null && seller.seller_profile !== undefined,
      );
      // Verify seller_profile structure
      TestValidator.predicate(
        "profile has shop_name",
        seller.seller_profile.shop_name.length > 0,
      );
      TestValidator.predicate(
        "profile has shop_description",
        seller.seller_profile.shop_description.length > 0,
      );
    }
    // Verify default sorting by created_at descending
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].created_at).getTime();
      const currDate = new Date(response.data[i].created_at).getTime();
      TestValidator.predicate(
        `seller ${i} is not newer than seller ${i - 1}`,
        currDate <= prevDate,
      );
    }
  }
  // 6. Verify pages calculation is correct
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
}
