import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that platform admin customer-session inspection endpoint enforces
 * authorization, by rejecting unauthenticated requests while allowing a
 * properly authenticated platform admin.
 *
 * Business context
 *
 * - Customer sessions are managed internally and are viewable only to platform
 *   administrators through GET
 *   /shoppingMall/platformAdmin/customers/{customerId}/sessions/{sessionId}.
 * - A customer password reset completion can create or update a session, but our
 *   test focuses on the admin visibility and authorization behavior of the
 *   admin-only endpoint, not on full session lifecycle.
 *
 * Test objectives
 *
 * 1. Ensure that unauthenticated requests to the admin session-inspection endpoint
 *    fail with an error.
 * 2. Confirm that, after joining as a platform admin, the same endpoint succeeds
 *    and returns a valid IShoppingMallCustomerSession DTO.
 *
 * Scenario steps
 *
 * 1. Trigger a customer password reset request (POST
 *    /auth/customer/password/reset/request) with a random email to exercise the
 *    reset flow and ensure customer-related auth pipeline is working.
 * 2. Complete a password reset (POST /auth/customer/password/reset) using a random
 *    token and strong password, receiving an IShoppingMallCustomer.IAuthorized
 *    response as a side-effect; assert the response type.
 * 3. Independently prepare a random customerId and sessionId UUID pair for use in
 *    the admin session-inspection endpoint. This leverages the Nestia
 *    simulator/random behavior; we focus on authorization, not referential DB
 *    integrity.
 * 4. Build an unauthenticated connection by cloning the input connection and
 *    resetting headers to an empty object. Call
 *    api.functional.shoppingMall.platformAdmin.customers.sessions.at with the
 *    random UUIDs and assert via TestValidator.error that an error is thrown,
 *    indicating authorization failure.
 * 5. Join as a platform admin using POST /auth/platformAdmin/join with a valid
 *    IShoppingMallPlatformAdminJoin.IRequest payload. The SDK will
 *    automatically populate connection.headers.Authorization with a valid
 *    access token; assert the returned IShoppingMallPlatformAdmin.IAuthorized.
 * 6. With the authenticated connection, call
 *    api.functional.shoppingMall.platformAdmin.customers.sessions.at using the
 *    same random customerId and sessionId pair. Assert that the
 *    IShoppingMallCustomerSession response passes typia.assert and that the id
 *    and shopping_mall_customer_id fields are UUID strings.
 */
export async function test_api_platform_admin_cannot_access_customer_session_without_auth(
  connection: api.IConnection,
) {
  // 1. Request customer password reset (exercise auth flow; we don't use its side-effects directly)
  const resetRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: resetRequestBody },
    );
  typia.assert(resetRequestResult);

  // 2. Complete password reset to obtain a customer authorization envelope
  const resetPasswordBody = {
    token: RandomGenerator.alphaNumeric(32),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerAuth.IResetPassword;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: resetPasswordBody,
      },
    );
  typia.assert(customerAuthorized);

  // 3. Prepare random UUIDs for customer and session to use with the admin endpoint
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Unauthenticated connection: expect authorization error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated admin session access must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.sessions.at(
        unauthenticatedConnection,
        {
          customerId,
          sessionId,
        },
      );
    },
  );

  // 5. Join as platform admin to obtain a valid Authorization token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Authenticated platform admin connection: expect successful session fetch
  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.at(
      connection,
      {
        customerId,
        sessionId,
      },
    );
  typia.assert(session);

  // Basic sanity checks that returned DTO uses non-empty UUID-like strings
  TestValidator.predicate(
    "session.id must be a non-empty string",
    typeof session.id === "string" && session.id.length > 0,
  );
  TestValidator.predicate(
    "session.shopping_mall_customer_id must be a non-empty string",
    typeof session.shopping_mall_customer_id === "string" &&
      session.shopping_mall_customer_id.length > 0,
  );
}
