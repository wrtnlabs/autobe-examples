import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverview";
import type { IShoppingMallActorSecurityOverviewPerActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityOverviewPerActorType";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Enforce authorization on admin security overview endpoint.
 *
 * This test verifies that `/shoppingMall/admin/actors/securityOverview` is only
 * accessible to authenticated admin actors, and that both unauthenticated
 * callers and authenticated non-admin actors (customers and sellers) are
 * rejected with appropriate HTTP status codes.
 *
 * Workflow:
 *
 * 1. Unauthenticated: clone the base connection with empty headers and attempt to
 *    call the security overview endpoint, expecting HTTP 401.
 * 2. Customer: perform customer join to obtain a customer-authenticated
 *    connection, then attempt the security overview endpoint and expect HTTP
 *    403 forbidden for non-admin actor.
 * 3. Seller: perform seller join to obtain a seller-authenticated connection, then
 *    attempt the security overview endpoint and again expect HTTP 403.
 * 4. Admin: perform admin join to obtain an admin-authenticated connection,
 *    successfully call the security overview endpoint, assert the response type
 *    using typia.assert, and validate some basic business invariants on the
 *    returned aggregate metrics.
 */
export async function test_api_admin_security_overview_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Unauthenticated caller: use a cloned connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated caller must receive 401 on security overview",
    401,
    async () => {
      await api.functional.shoppingMall.admin.actors.securityOverview.at(
        unauthenticatedConnection,
      );
    },
  );

  // 2. Authenticated customer (non-admin) should get 403
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  await TestValidator.httpError(
    "customer-authenticated caller must receive 403 on security overview",
    403,
    async () => {
      await api.functional.shoppingMall.admin.actors.securityOverview.at(
        connection,
      );
    },
  );

  // 3. Authenticated seller (non-admin) should also get 403
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  await TestValidator.httpError(
    "seller-authenticated caller must receive 403 on security overview",
    403,
    async () => {
      await api.functional.shoppingMall.admin.actors.securityOverview.at(
        connection,
      );
    },
  );

  // 4. Authenticated admin should successfully access the security overview
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const overview: IShoppingMallActorSecurityOverview =
    await api.functional.shoppingMall.admin.actors.securityOverview.at(
      connection,
    );
  typia.assert<IShoppingMallActorSecurityOverview>(overview);

  // Basic business invariants on the aggregated overview
  TestValidator.predicate(
    "totalSecurityEventCount must be a non-negative integer",
    overview.totalSecurityEventCount >= 0,
  );

  TestValidator.predicate(
    "per-actor type counts must be non-negative and not exceed totalSecurityEventCount",
    () => {
      let sum = 0;
      for (const perType of overview.perActorType) {
        if (
          perType.recentFailedLoginCount < 0 ||
          perType.recentSuccessfulLoginCount < 0 ||
          perType.recentPasswordResetCount < 0 ||
          perType.activeRiskFlagCount < 0
        )
          return false;

        sum +=
          perType.recentFailedLoginCount +
          perType.recentSuccessfulLoginCount +
          perType.recentPasswordResetCount;
      }
      return sum <= overview.totalSecurityEventCount;
    },
  );
}
