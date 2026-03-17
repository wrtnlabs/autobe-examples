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

export async function test_api_seller_session_detail_retrieved_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super admin and get authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // Step 2: Register a seller and capture the response (id, email, token)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  const sellerEmail = sellerAuthorized.email;
  const sellerAccessToken = sellerAuthorized.token.access;
  // Step 3: As super admin, retrieve the paginated list of sessions for the seller
  const sessionPage =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  // The seller just registered so there must be at least one session
  TestValidator.predicate(
    "seller has at least one session",
    sessionPage.data.length > 0,
  );
  // Take the first (most recent) session
  const sessionSummary = sessionPage.data[0]!;
  const sessionId = sessionSummary.id;
  // Step 4: Retrieve the full session detail as super admin
  const session =
    await api.functional.shoppingMall.superAdmin.sellers.sessions.at(
      superAdminConnection,
      {
        sellerId: sellerId,
        sessionId: sessionId,
      },
    );
  typia.assert(session);
  // Step 5 & 6: Validate business logic
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals("seller id matches", session.seller.id, sellerId);
  TestValidator.equals(
    "seller email matches",
    session.seller.email,
    sellerEmail,
  );
  TestValidator.equals("seller is not banned", session.seller.isBanned, false);
  TestValidator.equals(
    "seller is not suspended",
    session.seller.isSuspended,
    false,
  );
  TestValidator.predicate(
    "access_token is non-empty",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token is non-empty",
    session.refresh_token.length > 0,
  );
  TestValidator.predicate("ip is non-empty", session.ip.length > 0);
  TestValidator.predicate("href is non-empty", session.href.length > 0);
  TestValidator.predicate(
    "expired_at is after created_at",
    new Date(session.expired_at) > new Date(session.created_at),
  );
  // Step 7: Confirm the access_token in the session record matches the seller's token
  TestValidator.equals(
    "access_token matches seller join token",
    session.access_token,
    sellerAccessToken,
  );
}
