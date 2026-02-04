import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAccountStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAccountStatusHistory";
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

export async function test_api_seller_account_status_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "admin123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 2: Create seller account with empty body
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  // Step 3: Get seller account ID for approval
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  const sellerId = sellerAuth.id;
  // Step 4: Approve seller account as the admin
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerId satisfies string & tags.Format<"uuid">,
  });
  // Step 5: Confirm the seller's status can be retrieved
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Step 6: Retrieve account status history
  const history =
    await api.functional.shoppingMall.seller.account_status_histories.at(
      sellerConnection,
      {
        id: sellerId,
      },
    );
  typia.assert(history);
  TestValidator.equals(
    "target_status is approved",
    history.target_status,
    "approved",
  );
}
