import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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

export async function test_api_product_snapshot_admin_access_denied_on_seller_endpoint(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: An admin attempts to retrieve product snapshot history via the seller endpoint and receives a 403 Forbidden error, enforcing role-based access separation.
  // 1. Create admin user and store credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  // 2. Log in admin with stored credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginResponse);
  // 3. Create seller user and store credentials (to trigger the auth context)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  // 4. Log in seller with stored credentials (unused for this test)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResponse = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResponse);
  // 5. Admin attempts to access seller product snapshots endpoint with random product ID
  // Must be denied access: seller endpoint only allows seller actor
  // Random platform UUID is generated — existence irrelevant; auth is the gate
  const spoofedProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Admin should be denied access to seller product snapshots endpoint",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.at(
        adminLoginConnection, // Use admin connection for the call
        { productId: spoofedProductId },
      );
    },
  );
}
