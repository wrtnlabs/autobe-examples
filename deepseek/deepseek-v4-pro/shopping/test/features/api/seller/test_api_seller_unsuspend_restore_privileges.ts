import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_unsuspend_restore_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register and authenticate seller (starts in "pending" approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the pending seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller should be approved",
    approvedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "suspended_at should be null after approval",
    approvedSeller.suspended_at,
    null,
  );
  // 4. Administrator suspends the approved seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(suspendedSeller);
  TestValidator.predicate(
    "suspended_at should be set after suspension",
    suspendedSeller.suspended_at !== null,
  );
  // 5. Administrator unsuspends the suspended seller
  const unsuspendedSeller =
    await api.functional.shoppingMall.admin.sellers.unsuspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(unsuspendedSeller);
  // 6. Validate unsuspension results
  TestValidator.equals(
    "suspended_at should be cleared to null after unsuspension",
    unsuspendedSeller.suspended_at,
    null,
  );
  TestValidator.equals(
    "approval_status should remain 'approved' after unsuspension",
    unsuspendedSeller.approval_status,
    "approved",
  );
  TestValidator.notEquals(
    "updated_at should be refreshed after unsuspension",
    unsuspendedSeller.updated_at,
    suspendedSeller.updated_at,
  );
}
