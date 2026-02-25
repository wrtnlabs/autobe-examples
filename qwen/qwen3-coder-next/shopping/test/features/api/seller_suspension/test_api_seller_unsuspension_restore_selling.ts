import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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

export async function test_api_seller_unsuspension_restore_selling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as any,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as any,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAccount);
  // 3. Suspend the seller first to create suspended state
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspensions.updateSuspension(
      adminConnection,
      {
        sellerId: sellerAccount.data.profile.id,
        body: {
          action: "suspend",
          reason: "Testing suspension workflow",
        } satisfies IShoppingMallSeller.ISuspensionRequest,
      },
    );
  typia.assert(suspendedSeller);
  TestValidator.equals("seller suspended", suspendedSeller.suspended, true);
  // 4. Unsuspend the seller
  const unsuspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspensions.updateSuspension(
      adminConnection,
      {
        sellerId: sellerAccount.data.profile.id,
        body: {
          action: "unsuspend",
          reason: "Testing unsuspension workflow",
        } satisfies IShoppingMallSeller.ISuspensionRequest,
      },
    );
  typia.assert(unsuspendedSeller);
  // 5. Verify seller status is restored to active
  TestValidator.equals(
    "seller unsuspended",
    unsuspendedSeller.suspended,
    false,
  );
  // 6. Verify seller can login after unsuspension
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAccount.data.profile.shop_name + "@test.com",
      password: "1234",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 7. Verify approval status is restored
  TestValidator.equals(
    "approval status restored",
    unsuspendedSeller.approval_status,
    "approved",
  );
}
