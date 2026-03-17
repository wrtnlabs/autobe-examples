import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_seller_unban_preserves_suspension_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup seller connection and get seller info
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.seller.id;
  // 3. Suspend the seller FIRST (before banning), since suspend endpoint
  //    rejects sellers who are already banned.
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "isSuspended is true after suspend",
    suspendedSeller.isSuspended,
    true,
  );
  // 4. Now ban the seller — seller is now both suspended AND banned
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId },
  );
  typia.assert(bannedSeller);
  TestValidator.equals(
    "isBanned is true after ban",
    bannedSeller.isBanned,
    true,
  );
  TestValidator.equals(
    "isSuspended still true after ban",
    bannedSeller.isSuspended,
    true,
  );
  // 5. Unban the seller — this should ONLY lift the ban, NOT the suspension
  const unbannedSeller = await api.functional.shoppingMall.admin.sellers.unban(
    adminConnection,
    { sellerId },
  );
  typia.assert(unbannedSeller);
  // 6. Validate: isBanned is now false (ban lifted)
  TestValidator.equals(
    "isBanned is false after unban",
    unbannedSeller.isBanned,
    false,
  );
  // 7. Validate: isSuspended is still true (suspension NOT cleared by unban)
  TestValidator.equals(
    "isSuspended remains true after unban",
    unbannedSeller.isSuspended,
    true,
  );
  // 8. Validate: deletedAt is null (account is not deleted)
  TestValidator.equals("deletedAt is null", unbannedSeller.deletedAt, null);
}
