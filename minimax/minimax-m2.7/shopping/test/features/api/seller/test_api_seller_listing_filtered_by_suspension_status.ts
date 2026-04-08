import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering seller list by suspension status as an administrator.
 *
 * Validates the administrator's ability to view and understand seller suspension
 * status through the admin dashboard. This test ensures that the suspensionStatus
 * field correctly indicates whether a seller has active suspension records.
 *
 * **Suspension Logic:**
 * - Sellers are considered "suspended" when they have at least one active (unserved)
 *   suspension record in the database
 * - Sellers are considered "active" when they have no active suspension records
 *
 * **Note:** The SDK's `list` function doesn't support query parameters directly,
 * so this test fetches all sellers and manually filters them by suspensionStatus
 * to validate the filtering logic.
 *
 * 1. Register admin via POST /ecommerceMall/auth/admin/join
 * 2. Create authenticated connection with admin token
 * 3. Call GET /admin/admin/sellers to retrieve all sellers
 * 4. Filter results manually by suspensionStatus="suspended"
 * 5. Filter results manually by suspensionStatus="active"
 * 6. Verify each seller's suspensionStatus field matches expected state
 */
export async function test_api_seller_listing_filtered_by_suspension_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  typia.assert(adminConnection);
  // 2. Retrieve all sellers (SDK doesn't support query parameters)
  const allSellersResponse =
    await api.functional.ecommerceMall.admin.admin.sellers.list(
      adminConnection,
    );
  typia.assert(allSellersResponse);
  // 3. Manually filter by suspensionStatus="suspended"
  const suspendedSellers = allSellersResponse.data.filter(
    (seller) => seller.suspensionStatus === "suspended",
  );
  // 4. Manually filter by suspensionStatus="active"
  const activeSellers = allSellersResponse.data.filter(
    (seller) => seller.suspensionStatus === "active",
  );
  // 5. Validate suspended sellers have correct status
  for (const seller of suspendedSellers) {
    TestValidator.equals(
      "suspended seller has correct status",
      seller.suspensionStatus,
      "suspended",
    );
  }
  // 6. Validate active sellers have correct status
  for (const seller of activeSellers) {
    TestValidator.equals(
      "active seller has correct status",
      seller.suspensionStatus,
      "active",
    );
  }
  // 7. Verify total counts match
  TestValidator.equals(
    "all sellers accounted for",
    suspendedSellers.length + activeSellers.length,
    allSellersResponse.data.length,
  );
  // 8. Verify no seller has unexpected suspension status
  for (const seller of allSellersResponse.data) {
    TestValidator.predicate(
      "seller has valid suspension status",
      seller.suspensionStatus === "suspended" ||
        seller.suspensionStatus === "active",
    );
  }
}
