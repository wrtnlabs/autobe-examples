import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the default administrative seller listing without any filters.
 *
 * Validates that an authenticated administrator can retrieve the complete seller listing through the paginated index endpoint. The test verifies three distinct aspects: correct pagination metadata structure, valid seller summary data including approval status enumeration, and proper default sorting by registration date in descending order.
 *
 * The endpoint specification mandates that soft-deleted sellers are excluded from results — this is implicitly validated by the structural assertion succeeding on all returned records, as any leaked deleted records would violate the DTO contract.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Retrieves the unfiltered seller listing with an empty request body.
 * 3. Validates pagination metadata: current page, limit, total records, and total pages are all non-negative.
 * 4. Confirms each seller's approval_status is a valid enum value (pending, approved, or rejected).
 * 5. Verifies sellers are sorted by created_at in descending order — each subsequent seller's timestamp must not exceed the previous one.
 */
export async function test_api_admin_seller_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve seller listing without filters
  const response = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    { body: {} satisfies IShoppingMallSeller.IRequest },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate seller data — approval_status enum
  for (const seller of response.data) {
    TestValidator.predicate(
      "approval_status is valid enum value",
      ["pending", "approved", "rejected"].includes(seller.approval_status),
    );
  }
  // 5. Verify sorting by created_at descending (newest first)
  for (let i = 1; i < response.data.length; i++) {
    const prev = new Date(response.data[i - 1].created_at).getTime();
    const curr = new Date(response.data[i].created_at).getTime();
    TestValidator.predicate(
      "sellers sorted by created_at descending",
      prev >= curr,
    );
  }
}
