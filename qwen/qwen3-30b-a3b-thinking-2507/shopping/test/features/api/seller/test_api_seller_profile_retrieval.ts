import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

export async function test_api_seller_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {} satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Step 2: Create a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {} satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 3: Authenticate as admin
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_login(
    adminAuthConnection,
    {
      body: {
        email: `${admin.id}@example.com`,
        password: "Admin123!$",
        href: "http://localhost",
        referrer: "http://localhost",
        ip: "127.0.0.1",
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);
  // Step 4: Retrieve the seller profile
  const sellerProfile: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(adminAuthConnection, {
      sellerId: seller.sellerCode,
    });
  typia.assert(sellerProfile);
  // Step 5: Validation
  TestValidator.equals("seller id matches", sellerProfile.id, seller.id);
  TestValidator.equals(
    "seller shop name matches",
    sellerProfile.shopName,
    seller.shopName,
  );
  TestValidator.equals(
    "seller status matches",
    sellerProfile.status,
    seller.status,
  );
}
