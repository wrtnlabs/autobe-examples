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
 * Validate platform admin visibility of customer sessions after password reset.
 *
 * Business goal: Ensure that a platform administrator, after joining and being
 * authenticated, can call the session-inspection endpoint and receive a
 * structurally correct IShoppingMallCustomerSession object for a given
 * customer/session pair, in the context of a customer password reset flow. Also
 * ensure that the endpoint enforces admin authorization and that session
 * lifecycle fields are self-consistent.
 *
 * High-level steps:
 *
 * 1. Join as a platform admin to obtain Authorization on the connection.
 * 2. Trigger a customer password reset request (opaque / no observable token).
 * 3. Complete a customer password reset, receiving an authorized customer envelope
 *    with a concrete customer id.
 * 4. As the platform admin (same connection), call the session-inspection endpoint
 *    for some (customerId, sessionId) pair.
 * 5. Assert that the returned session matches IShoppingMallCustomerSession and
 *    that basic lifecycle invariants hold.
 * 6. Confirm that omitting Authorization causes the session-inspection call to
 *    fail.
 */
export async function test_api_platform_admin_view_customer_session_after_password_reset(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain Authorization header on the connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Trigger a customer password reset request with a random email
  const passwordResetRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const passwordResetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      { body: passwordResetRequestBody },
    );
  typia.assert(passwordResetRequestResult);

  // 3. Complete a customer password reset to obtain an authorized customer
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

  const customerId = customerAuthorized.id;

  // 4. As platform admin, fetch a specific session for this customer.
  //    We cannot derive a real sessionId from available APIs, so we use a
  //    random UUID. In simulate mode or a seeded environment, this still
  //    exercises type contracts and admin scoping.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.at(
      connection,
      {
        customerId,
        sessionId,
      },
    );
  typia.assert(session);

  // 5. Validate basic session lifecycle invariants
  // created_at must not be in the future (relative to now)
  const now = new Date();
  const createdAt = new Date(session.created_at);
  await TestValidator.predicate(
    "session.created_at should not be in the future",
    async () => createdAt.getTime() <= now.getTime(),
  );

  // If expired_at is present, it must not be before created_at
  if (session.expired_at !== null && session.expired_at !== undefined) {
    const expiredAt = new Date(session.expired_at);
    await TestValidator.predicate(
      "session.expired_at should be on or after created_at",
      async () => expiredAt.getTime() >= createdAt.getTime(),
    );
  }

  // duration_seconds, when defined and non-null, must be >= 0
  if (
    session.duration_seconds !== null &&
    session.duration_seconds !== undefined
  ) {
    await TestValidator.predicate(
      "session.duration_seconds should be non-negative",
      async () => session.duration_seconds! >= 0,
    );
  }

  // We do not enforce specific values of status or strict correlation between
  // status and expiration timestamps, as the schema leaves status
  // implementation-defined. We only ensure that when everything is present, the
  // values are self-consistent in the basic sense checked above.

  // 6. Authorization negative test: calling without Authorization must fail.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "platform admin session view should require authorization",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.sessions.at(
        unauthConn,
        {
          customerId,
          sessionId,
        },
      );
    },
  );
}
