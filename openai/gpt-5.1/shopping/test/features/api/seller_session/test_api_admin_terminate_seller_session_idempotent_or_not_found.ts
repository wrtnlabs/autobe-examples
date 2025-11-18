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
 * Validate that admin-driven seller session termination is safe and idempotent
 * even when targeting non-existent or already-terminated sessions.
 *
 * Business goals:
 *
 * - Ensure an admin can call the session-termination endpoint multiple times for
 *   the same seller/session pair without causing server errors.
 * - Verify that using random or unknown session identifiers does not leak
 *   implementation details (e.g., via HttpError) and behaves as a safe no-op
 *   from the API consumer’s perspective.
 *
 * High-level flow:
 *
 * 1. Create an admin via POST /auth/admin/join.
 * 2. Log the admin in via POST /auth/admin/login so that the connection is in an
 *    authenticated admin context.
 * 3. Create a seller via POST /auth/seller/join and capture sellerId.
 * 4. Log that seller in via POST /auth/seller/login to ensure that the seller has
 *    at least one real session (even though we can’t see its sessionId from the
 *    API types).
 * 5. Switch back to the admin account via POST /auth/admin/login.
 * 6. As admin, call DELETE
 *    /shoppingMall/admin/sellers/{sellerId}/sessions/{sessionId} using the real
 *    sellerId and a synthetic random UUID for sessionId, and assert the call
 *    completes without throwing.
 * 7. Call the same DELETE again with the same sellerId and sessionId to confirm
 *    idempotent behavior (still no error).
 * 8. Optionally, call DELETE with another random sessionId to ensure consistent
 *    behavior for different non-existent sessions.
 */
export async function test_api_admin_terminate_seller_session_idempotent_or_not_found(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  // 2. Admin login to ensure a clean authenticated admin context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.example.com/login",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Seller join to obtain a concrete sellerId
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.example.com/join",
    referrer: "https://seller.shoppingmall.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoined);

  const sellerId: string & tags.Format<"uuid"> = sellerJoined.id;

  // 4. Seller login to ensure at least one valid session exists
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.example.com/login",
    referrer: "https://seller.shoppingmall.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Switch back to admin context so that we can call the admin-only
  //    session termination endpoint. The SDK updates Authorization
  //    headers automatically.
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  // 6. Admin invokes DELETE for a non-existent (synthetic) sessionId.
  const syntheticSessionId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.shoppingMall.admin.sellers.sessions.erase(connection, {
    sellerId,
    sessionId: syntheticSessionId1,
  });

  // If the call completes without throwing, we consider it safe for
  // unknown sessions. Use a predicate check purely for documentation
  // purposes in test output.
  TestValidator.predicate(
    "first synthetic session termination completes without error",
    true,
  );

  // 7. Call DELETE again with the same synthetic sessionId to validate
  //    idempotent or not-found-safe behavior.
  await api.functional.shoppingMall.admin.sellers.sessions.erase(connection, {
    sellerId,
    sessionId: syntheticSessionId1,
  });

  TestValidator.predicate(
    "second synthetic session termination remains safe and idempotent",
    true,
  );

  // 8. Optionally, try with a different synthetic sessionId to ensure
  //    consistent behavior across different unknown identifiers.
  const syntheticSessionId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.shoppingMall.admin.sellers.sessions.erase(connection, {
    sellerId,
    sessionId: syntheticSessionId2,
  });

  TestValidator.predicate(
    "third synthetic session termination with different ID also succeeds",
    true,
  );
}
