import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test filtering seller suspensions by restoration status.
 *
 * Steps:
 * 1. Authenticate as admin
 * 2. Create two seller accounts
 * 3. Suspend first seller (remains suspended)
 * 4. Suspend second seller, then restore
 * 5. Filter by restored_at=null to get currently suspended sellers
 * 6. Validate response contains only currently suspended sellers
 * 7. Filter by restored_at_from to get restored suspensions
 * 8. Validate response contains only restored sellers
 * 9. Verify restoredBy admin information present in restored records
 */
export async function test_api_seller_suspension_filter_by_restoration_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1);
  // 3. Create second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2);
  // 4. Suspend first seller (remains suspended)
  const suspension1 =
    await api.functional.ecommerceMall.admin.seller_suspensions.create(
      adminConnection,
      {
        body: {
          seller_id: seller1.id,
          reason: "Policy violation - first seller",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension1);
  TestValidator.equals("first seller suspended", suspension1.restored_at, null);
  TestValidator.equals(
    "first seller suspension reason",
    suspension1.reason,
    "Policy violation - first seller",
  );
  // 5. Suspend second seller
  const suspension2 =
    await api.functional.ecommerceMall.admin.seller_suspensions.create(
      adminConnection,
      {
        body: {
          seller_id: seller2.id,
          reason: "Policy violation - second seller",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension2);
  TestValidator.equals(
    "second seller initially suspended",
    suspension2.restored_at,
    null,
  );
  // 6. Restore second seller
  const restoredSuspension2 =
    await api.functional.ecommerceMall.admin.seller_suspensions.restore(
      adminConnection,
      {
        suspensionId: suspension2.id,
        body: {
          restored_reason: "Seller has corrected the issue",
        } satisfies IEcommerceMallSellerSuspension.IUpdate,
      },
    );
  typia.assert(restoredSuspension2);
  TestValidator.predicate(
    "second seller restored",
    restoredSuspension2.restored_at !== null,
  );
  TestValidator.equals(
    "restored reason set",
    restoredSuspension2.restored_reason,
    "Seller has corrected the issue",
  );
  // 7. Filter by restored_at=null to get currently suspended sellers only
  const currentlySuspendedPage =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          restored_at: null,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(currentlySuspendedPage);
  // 8. Validate response contains only currently suspended sellers
  TestValidator.predicate("has data", currentlySuspendedPage.data.length > 0);
  for (const item of currentlySuspendedPage.data) {
    TestValidator.equals(
      "restored_at is null for currently suspended",
      item.restored_at,
      null,
    );
  }
  // Verify first seller is in the currently suspended list
  const suspendedSellers = currentlySuspendedPage.data.map((s) => s.seller.id);
  TestValidator.predicate(
    "first seller is currently suspended",
    suspendedSellers.includes(seller1.id),
  );
  TestValidator.predicate(
    "second seller is NOT in currently suspended",
    !suspendedSellers.includes(seller2.id),
  );
  // 9. Filter by restored_at_from to get restored suspensions
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1); // Set to 1 year ago to capture any restoration
  const restoredPage =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          restored_at_from: pastDate.toISOString(),
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(restoredPage);
  // 10. Validate response contains only restored sellers
  TestValidator.predicate("has restored data", restoredPage.data.length > 0);
  for (const item of restoredPage.data) {
    TestValidator.predicate(
      "restored_at is not null for restored",
      item.restored_at !== null,
    );
  }
  // Verify second seller is in the restored list
  const restoredSellers = restoredPage.data.map((s) => s.seller.id);
  TestValidator.predicate(
    "second seller is in restored list",
    restoredSellers.includes(seller2.id),
  );
  TestValidator.predicate(
    "first seller is NOT in restored list",
    !restoredSellers.includes(seller1.id),
  );
  // 11. Verify restoredBy admin information present in restored records
  for (const item of restoredPage.data) {
    if (item.restoredBy !== null && item.restoredBy !== undefined) {
      TestValidator.equals(
        "restored by admin id matches",
        item.restoredBy.id,
        admin.id,
      );
      TestValidator.equals(
        "restored by admin email",
        item.restoredBy.email,
        admin.email,
      );
    }
  }
}
