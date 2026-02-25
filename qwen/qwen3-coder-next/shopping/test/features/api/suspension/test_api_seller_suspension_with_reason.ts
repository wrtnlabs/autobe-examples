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

export async function test_api_seller_suspension_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  // Store seller credentials for later login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerShopName = RandomGenerator.name();
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: sellerShopName,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Login as seller to get seller ID
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 4. Admin suspends seller with reason
  const suspension =
    await api.functional.shoppingMall.admin.sellers.suspensions.updateSuspension(
      adminConnection,
      {
        sellerId: seller.data.profile.id,
        body: {
          action: "suspend",
          reason: "Suspension reason - violation of terms",
        } satisfies IShoppingMallSeller.ISuspensionRequest,
      },
    );
  typia.assert(suspension);
  // 5. Validate suspension response
  TestValidator.equals(
    "suspension id matches",
    suspension.id,
    seller.data.profile.id,
  );
  TestValidator.equals(
    "shop name matches",
    suspension.shop_name,
    sellerShopName,
  );
  TestValidator.equals(
    "approval status is pending after suspension",
    suspension.approval_status,
    "pending",
  );
  TestValidator.equals("suspended flag is true", suspension.suspended, true);
  TestValidator.equals(
    "suspension reason matches",
    suspension.suspension_reason,
    "Suspension reason - violation of terms",
  );
}
