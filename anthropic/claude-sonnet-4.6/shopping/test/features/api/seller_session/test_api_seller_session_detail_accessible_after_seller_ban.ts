import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_session_detail_accessible_after_seller_ban(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminAuthorized);
  // Step 2: Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // Step 3: As superAdmin, retrieve the session list for the seller to obtain sessionId
  const sessionsPage =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionsPage);
  // Validate the session list is not empty and get the first session id
  TestValidator.predicate(
    "session list is not empty",
    sessionsPage.data.length > 0,
  );
  const firstSession = sessionsPage.data[0]!;
  const sessionId = firstSession.id;
  // Step 4: As superAdmin, ban the seller account
  const bannedSeller = await api.functional.shoppingMall.superAdmin.sellers.ban(
    superAdminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(bannedSeller);
  TestValidator.equals(
    "seller is banned after ban operation",
    bannedSeller.isBanned,
    true,
  );
  // Step 5: Call GET session detail for the banned seller - audit records must still be accessible
  const sessionDetail =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.at(
      superAdminConnection,
      {
        sellerId: sellerId,
        sessionId: sessionId,
      },
    );
  typia.assert(sessionDetail);
  // Step 7: Validate the response body - session is preserved and reflects updated ban state
  TestValidator.equals(
    "session id matches expected sessionId",
    sessionDetail.id,
    sessionId,
  );
  TestValidator.equals(
    "seller id matches the banned seller",
    sessionDetail.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "seller isBanned reflects true after ban",
    sessionDetail.seller.isBanned,
    true,
  );
}
