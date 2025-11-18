import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

/**
 * Validate admin-driven termination of a specific guest user's session without
 * impacting other guest users.
 *
 * Business context:
 *
 * - The shopping mall platform supports guest users whose shopping behavior is
 *   tracked via guest carts and guest sessions.
 * - Administrators can forcibly terminate guest sessions through DELETE
 *   /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}.
 * - Guest carts are created via customer-facing cart APIs using the actor_type
 *   "guestuser".
 *
 * This test validates that:
 *
 * 1. An administrator can be registered and authenticated using /auth/admin/join.
 * 2. Two distinct guest carts can be created using /shoppingMall/customer/carts
 *    with actor_type "guestuser", yielding two different guest identities.
 * 3. The admin can invoke the session erase endpoint for one guest (guestUserId_A,
 *    sessionId_A) without any type or authentication issues.
 * 4. The admin can subsequently invoke the same endpoint for a different guest
 *    (guestUserId_B, sessionId_B) in the same test, demonstrating independent
 *    handling of different guest users.
 *
 * Due to the available API surface, guest session identifiers are not exposed
 * by any read API, and there are no endpoints to inspect or list guest sessions
 * or to verify soft deletion of guest user records. Therefore, this test
 * focuses on the correctness of API usage, admin authorization, and separation
 * of calls for different guest user identifiers, rather than on internal
 * persistence state.
 */
export async function test_api_admin_guest_session_termination_for_different_guest_users(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an administrator via /auth/admin/join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two guest carts to derive two distinct guest user identities.
  const guestCartCreateBodyA = {
    actor_type: "guestuser",
  } satisfies IShoppingMallCart.ICreate;

  const guestCartCreateBodyB = {
    actor_type: "guestuser",
  } satisfies IShoppingMallCart.ICreate;

  const cartA: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: guestCartCreateBodyA,
    });
  typia.assert(cartA);

  const cartB: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: guestCartCreateBodyB,
    });
  typia.assert(cartB);

  // Basic cart sanity checks.
  TestValidator.equals(
    "cartA actor_type should be guestuser",
    cartA.actor_type,
    "guestuser",
  );
  TestValidator.equals(
    "cartB actor_type should be guestuser",
    cartB.actor_type,
    "guestuser",
  );
  TestValidator.notEquals(
    "cartA and cartB must be distinct carts",
    cartA.id,
    cartB.id,
  );

  // 3. Extract or synthesize guest user IDs for the two carts.
  let guestUserIdA: string & tags.Format<"uuid">;
  if (cartA.owner_guestuser !== undefined && cartA.owner_guestuser !== null) {
    typia.assertGuard<IShoppingMallCartOwnerGuestUserSummary>(
      cartA.owner_guestuser,
    );
    guestUserIdA = cartA.owner_guestuser.id;
  } else {
    guestUserIdA = typia.random<string & tags.Format<"uuid">>();
  }

  let guestUserIdB: string & tags.Format<"uuid">;
  if (cartB.owner_guestuser !== undefined && cartB.owner_guestuser !== null) {
    typia.assertGuard<IShoppingMallCartOwnerGuestUserSummary>(
      cartB.owner_guestuser,
    );
    guestUserIdB = cartB.owner_guestuser.id;
  } else {
    guestUserIdB = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "guestUserIdA and guestUserIdB should be distinct",
    guestUserIdA,
    guestUserIdB,
  );

  // 4. Generate two independent session identifiers for the two guest users.
  const sessionIdA = typia.random<string & tags.Format<"uuid">>();
  const sessionIdB = typia.random<string & tags.Format<"uuid">>();

  TestValidator.notEquals(
    "sessionIdA and sessionIdB should be distinct",
    sessionIdA,
    sessionIdB,
  );

  // 5. As the authenticated admin, erase the first guest session.
  await api.functional.shoppingMall.admin.guestUsers.sessions.erase(
    connection,
    {
      guestUserId: guestUserIdA,
      sessionId: sessionIdA,
    },
  );

  // 6. Erase the second guest session for a different guest user to
  // demonstrate independent handling.
  await api.functional.shoppingMall.admin.guestUsers.sessions.erase(
    connection,
    {
      guestUserId: guestUserIdB,
      sessionId: sessionIdB,
    },
  );
}
