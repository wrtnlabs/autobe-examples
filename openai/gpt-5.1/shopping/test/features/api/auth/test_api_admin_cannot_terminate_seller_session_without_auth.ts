import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that admin seller-session termination endpoint enforces admin
 * authentication.
 *
 * Business goal
 *
 * - Ensure that DELETE
 *   /shoppingMall/admin/sellers/{sellerId}/sessions/{sessionId} cannot be
 *   invoked successfully when there is no admin Authorization header, while
 *   confirming that the same operation works with proper admin auth.
 *
 * High-level flow
 *
 * 1. Create and login an admin so that we have a valid admin connection
 *    (positive-control actor).
 * 2. Create and login a seller to obtain a real sellerId and implicitly create at
 *    least one seller session.
 * 3. Build an unauthenticated connection (no Authorization header) and attempt to
 *    call the admin session-erase endpoint; assert that it fails.
 * 4. With the authenticated admin connection, call the same erase endpoint and
 *    assert that it succeeds (no error).
 */
export async function test_api_admin_cannot_terminate_seller_session_without_auth(
  connection: api.IConnection,
) {
  // 1. Admin join (creates admin account and initial authorized context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  // 1-2. Explicit admin login to mimic normal flow (and refresh token in headers)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Snapshot a dedicated admin-authenticated connection after login.
  const adminConnection: api.IConnection = { ...connection };

  // 2. Seller join using a fresh connection so seller auth does not overwrite admin token.
  const sellerConnection: api.IConnection = { ...connection };

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(sellerConnection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  // 2-2. Seller login to ensure we have an active seller session
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(sellerConnection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // Use the authenticated seller identity as the target of session-termination
  const sellerId: string & tags.Format<"uuid"> = sellerLoggedIn.id;

  // We do not know the real sessionId; use a random UUID. This is fine because
  // our negative test is about authorization, not about record existence.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build an unauthenticated connection (no Authorization header) based on adminConnection
  const unauthenticatedConnection: api.IConnection = {
    ...adminConnection,
    headers: {},
  };

  // 4. Negative case: unauthenticated admin cannot terminate seller session
  await TestValidator.error(
    "unauthenticated admin cannot terminate seller session",
    async () => {
      await api.functional.shoppingMall.admin.sellers.sessions.erase(
        unauthenticatedConnection,
        {
          sellerId,
          sessionId,
        },
      );
    },
  );

  // 5. Positive control: authenticated admin can call erase without error
  await api.functional.shoppingMall.admin.sellers.sessions.erase(
    adminConnection,
    {
      sellerId,
      sessionId,
    },
  );
}
