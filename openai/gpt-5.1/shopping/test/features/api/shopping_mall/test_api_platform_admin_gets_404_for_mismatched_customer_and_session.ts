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

export async function test_api_platform_admin_gets_404_for_mismatched_customer_and_session(
  connection: api.IConnection,
) {
  // 1. Join a platform admin to obtain an authenticated admin session
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Exercise customer password reset request flow (dependency smoke test)
  const resetRequestBody =
    typia.random<IShoppingMallCustomerAuth.IRequestPasswordReset>();
  const resetRequestResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetRequestResult,
  );

  // 3. Exercise customer password reset completion flow (dependency smoke test)
  const resetPasswordBody =
    typia.random<IShoppingMallCustomerAuth.IResetPassword>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.reset.resetPassword(
      connection,
      {
        body: resetPasswordBody,
      },
    );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 4. Simulate an existing customer session record to derive IDs for testing
  const simulatedSession: IShoppingMallCustomerSession =
    typia.random<IShoppingMallCustomerSession>();
  typia.assert<IShoppingMallCustomerSession>(simulatedSession);

  const validCustomerId = simulatedSession.shopping_mall_customer_id;
  const validSessionId = simulatedSession.id;

  // 5. Happy path: call sessions.at with matching customerId/sessionId
  const sessionWithMatchingIds: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.at(
      connection,
      {
        customerId: validCustomerId,
        sessionId: validSessionId,
      },
    );
  typia.assert<IShoppingMallCustomerSession>(sessionWithMatchingIds);

  // Basic business sanity: ensure the returned record pertains to the same IDs
  TestValidator.equals(
    "returned session id should match requested sessionId",
    sessionWithMatchingIds.id,
    validSessionId,
  );
  TestValidator.equals(
    "returned session customer id should match requested customerId",
    sessionWithMatchingIds.shopping_mall_customer_id,
    validCustomerId,
  );

  // 6. Mismatched parent-child: use a different customerId with the same sessionId
  const mismatchedCustomerId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "platform admin sessions.at must not expose session when customerId does not own it",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.sessions.at(
        connection,
        {
          customerId: mismatchedCustomerId,
          sessionId: validSessionId,
        },
      );
    },
  );
}
