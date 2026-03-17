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

export async function test_api_seller_profile_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a new seller account whose profile will be updated
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  const sellerEmail = sellerAuthorized.email;
  // 3. Admin performs full profile update
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerId,
      body: {
        shopName: "Updated Shop Name",
        shopDescription: "A wonderful shop selling quality goods",
        logoUrl: "https://example.com/logo.png",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 4. Validate response fields
  TestValidator.equals("seller id matches", updatedSeller.id, sellerId);
  TestValidator.equals(
    "shopName updated",
    updatedSeller.shopName,
    "Updated Shop Name",
  );
  TestValidator.equals("email matches", updatedSeller.email, sellerEmail);
  TestValidator.equals("isBanned unchanged", updatedSeller.isBanned, false);
  TestValidator.equals(
    "isSuspended unchanged",
    updatedSeller.isSuspended,
    false,
  );
  TestValidator.equals(
    "deletedAt is null (active)",
    updatedSeller.deletedAt,
    null,
  );
  // 5. Partial update: shopName only, optional fields as null
  const partiallyUpdatedSeller =
    await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
      sellerId: sellerId,
      body: {
        shopName: "Another Shop Name",
        shopDescription: null,
        logoUrl: null,
      } satisfies IShoppingMallSeller.IUpdate,
    });
  typia.assert(partiallyUpdatedSeller);
  // 6. Validate partial update response
  TestValidator.equals(
    "shopName updated to another",
    partiallyUpdatedSeller.shopName,
    "Another Shop Name",
  );
  TestValidator.equals(
    "seller id still matches",
    partiallyUpdatedSeller.id,
    sellerId,
  );
  TestValidator.equals(
    "isBanned still unchanged",
    partiallyUpdatedSeller.isBanned,
    false,
  );
  TestValidator.equals(
    "isSuspended still unchanged",
    partiallyUpdatedSeller.isSuspended,
    false,
  );
}
