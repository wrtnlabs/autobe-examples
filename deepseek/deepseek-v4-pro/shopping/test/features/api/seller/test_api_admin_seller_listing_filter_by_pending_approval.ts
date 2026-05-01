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
 * Test administrator filtering seller listing by pending approval status.
 *
 * Validates that administrators can query the seller listing endpoint filtered
 * by approval_status set to 'pending'. This represents the critical workflow
 * where administrators review new seller registrations awaiting approval.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Administrator requests seller listing with approval_status filter set
 *    to 'pending'.
 * 3. Validates that every seller in the returned results has approval_status
 *    equal to 'pending', confirming the filter correctly excludes sellers
 *    with approved or rejected status.
 * 4. Confirms the response includes pagination metadata with current page,
 *    limit, total records, and total pages.
 */
export async function test_api_admin_seller_listing_filter_by_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Request seller listing filtered by pending approval
  const listing = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(listing);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    listing.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    listing.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    listing.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    listing.pagination.pages >= 0,
  );
  // 4. Validate every seller has approval_status 'pending'
  for (const seller of listing.data) {
    TestValidator.equals(
      "seller approval status is pending",
      seller.approval_status,
      "pending",
    );
  }
}
