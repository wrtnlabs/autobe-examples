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

export async function test_api_seller_suspension_without_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // adminConnection is now authenticated with admin token
  // 2. Create seller user using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerUser = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerUser);
  // Extract seller ID from the created seller
  const sellerId = sellerUser.data.profile.id;
  // 3. Admin suspends the seller without providing a reason
  const result =
    await api.functional.shoppingMall.admin.sellers.suspensions.updateSuspension(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          action: "suspend",
          reason: undefined,
        } satisfies IShoppingMallSeller.ISuspensionRequest,
      },
    );
  typia.assert(result);
  // 4. Validate suspension result
  TestValidator.equals(
    "seller should be in pending status",
    result.approval_status,
    "pending",
  );
  TestValidator.equals(
    "suspension reason should be null",
    result.suspension_reason,
    null,
  );
  TestValidator.equals("suspended flag should be true", result.suspended, true);
  TestValidator.equals("seller id should match", result.id, sellerId);
  TestValidator.predicate(
    "shop name preserved",
    () => result.shop_name !== undefined && result.shop_name.length > 0,
  );
}