import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering a seller's password reset history by date range.
 *
 * Verifies that administrators can filter a seller's password reset token records using the inclusive from/to date range parameters on created_at. Also validates the business rule that providing only one of the date bounds has no filtering effect — both bounds must be supplied together for the range filter to activate.
 *
 * 1. Administrator authenticates via join, creating an admin session.
 * 2. A seller account is created via join, providing the target seller ID.
 * 3. Password reset history is queried without filters as the baseline.
 * 4. History is queried with both from and to parameters forming an inclusive date range.
 * 5. History is queried with only the from parameter, confirming unfiltered results.
 * 6. History is queried with only the to parameter, confirming unfiltered results.
 * 7. Validates that single-bound queries return the same record count as unfiltered queries, proving the filter is inactive when only one bound is supplied.
 * 8. Validates that filtered results are a subset of all results.
 */
export async function test_api_seller_password_resets_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Query password resets without any filters (baseline)
  const allResets =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(allResets);
  // 4. Prepare date range spanning from 1 day ago to 1 day ahead
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - oneDayMs);
  const toDate = new Date(now.getTime() + oneDayMs);
  // 5. Query with both from and to (date range filter active)
  const filteredResets =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        } satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(filteredResets);
  // 6. Query with only from (should have no filtering effect per business rule)
  const fromOnlyResets =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          from: fromDate.toISOString(),
        } satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(fromOnlyResets);
  // 7. Query with only to (should have no filtering effect per business rule)
  const toOnlyResets =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          to: toDate.toISOString(),
        } satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(toOnlyResets);
  // 8. Validate business rule: single-bound filters return unfiltered results
  TestValidator.equals(
    "from-only returns same record count as unfiltered",
    fromOnlyResets.pagination.records,
    allResets.pagination.records,
  );
  TestValidator.equals(
    "to-only returns same record count as unfiltered",
    toOnlyResets.pagination.records,
    allResets.pagination.records,
  );
  // 9. Validate: filtered results are a subset of all results
  TestValidator.predicate(
    "filtered record count does not exceed unfiltered total",
    filteredResets.pagination.records <= allResets.pagination.records,
  );
}
