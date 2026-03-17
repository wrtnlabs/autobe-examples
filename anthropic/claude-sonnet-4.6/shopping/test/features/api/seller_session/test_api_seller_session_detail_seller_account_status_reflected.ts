import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
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

export async function test_api_seller_session_detail_seller_account_status_reflected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and authentication (creates a session at join time)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. Retrieve the seller's session list using admin connection
  const sessionList =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionList);
  TestValidator.predicate(
    "at least one session exists",
    sessionList.data.length > 0,
  );
  const sessionId = sessionList.data[0]!.id;
  // 4. Ban the seller using admin connection
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId },
  );
  typia.assert(bannedSeller);
  TestValidator.equals(
    "seller is banned after ban operation",
    bannedSeller.isBanned,
    true,
  );
  // 5. Retrieve session detail using admin connection
  const sessionDetail =
    await api.functional.shoppingMall.admin.sellers.sessions.at(
      adminConnection,
      { sellerId, sessionId },
    );
  typia.assert(sessionDetail);
  // 6. Validate session detail reflects updated seller account status
  TestValidator.equals("session id matches", sessionDetail.id, sessionId);
  TestValidator.equals("seller id matches", sessionDetail.seller.id, sellerId);
  TestValidator.equals(
    "seller is banned (reflected in session detail)",
    sessionDetail.seller.isBanned,
    true,
  );
  TestValidator.equals(
    "seller is not suspended",
    sessionDetail.seller.isSuspended,
    false,
  );
}
