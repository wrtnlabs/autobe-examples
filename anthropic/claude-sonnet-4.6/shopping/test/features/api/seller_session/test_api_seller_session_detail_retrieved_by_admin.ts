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

export async function test_api_seller_session_detail_retrieved_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
    },
  });
  const sellerId = sellerAuthorized.id;
  // Step 3: Retrieve paginated session list for the seller using admin connection
  const sessionPage =
    await api.functional.shoppingMall.admin.sellers.sessions.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  // Ensure at least one session exists (created during seller join)
  TestValidator.predicate(
    "session list has at least one entry",
    sessionPage.data.length > 0,
  );
  const firstSession = sessionPage.data[0]!;
  const sessionId = firstSession.id;
  // Main Test: GET /shoppingMall/admin/sellers/{sellerId}/sessions/{sessionId}
  const sessionDetail =
    await api.functional.shoppingMall.admin.sellers.sessions.at(
      adminConnection,
      {
        sellerId: sellerId,
        sessionId: sessionId,
      },
    );
  typia.assert(sessionDetail);
  // Validate session id matches requested sessionId
  TestValidator.equals("session id matches", sessionDetail.id, sessionId);
  // Validate seller.id matches requested sellerId
  TestValidator.equals("seller id matches", sessionDetail.seller.id, sellerId);
  // Validate seller.email matches registration email
  TestValidator.equals(
    "seller email matches",
    sessionDetail.seller.email,
    sellerEmail,
  );
  // Validate tokens are non-empty strings
  TestValidator.predicate(
    "access_token is non-empty",
    sessionDetail.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token is non-empty",
    sessionDetail.refresh_token.length > 0,
  );
  // Validate ip is a non-empty string
  TestValidator.predicate("ip is non-empty", sessionDetail.ip.length > 0);
  // Validate account state flags for newly registered seller
  TestValidator.equals(
    "seller is not banned",
    sessionDetail.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller is not suspended",
    sessionDetail.seller.isSuspended,
    false,
  );
}
