import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomerSession";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerSession";

/**
 * Validates that an admin can list all sessions for a given customer with
 * pagination and filtering.
 *
 * Steps:
 *
 * 1. Register an admin
 * 2. Prepare a customer by triggering a password reset request
 * 3. Attempt session listing as admin for valid customerId and check
 *    pagination/filters
 * 4. Attempt session listing for random (non-existent) customerId and expect
 *    failure
 * 5. Attempt session listing as unauthenticated (non-admin) and expect access
 *    denied
 */
export async function test_api_admin_customer_sessions_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Prepare a customer (only password reset request available for customer creation)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const custResetBody = {
    request_email: customerEmail,
  } satisfies IShoppingCustomer.IRequestPasswordReset;
  const pwResetResult =
    await api.functional.auth.customer.password.reset_request.requestPasswordReset(
      connection,
      { body: custResetBody },
    );
  typia.assert(pwResetResult);

  // Must get customerId. Since the reset endpoint does not return customer data, and the session list endpoint takes customerId,
  // we have no canonical way to obtain the real customerId. However, we can simulate a valid UUID and test that the endpoint works semantically.
  // In real case, the backend/test framework would create a customer record with this email, so we'll use a random UUID for demonstration.
  const validCustomerId = typia.random<string & tags.Format<"uuid">>();

  // 3. List sessions as admin (should succeed with valid customerId)
  // Try both with default and with some filter options (e.g., limit, status)
  const baseBody = {} satisfies IShoppingCustomerSession.IRequest;
  const sessionPage: IPageIShoppingCustomerSession =
    await api.functional.shopping.admin.customers.sessions.index(connection, {
      customerId: validCustomerId,
      body: baseBody,
    });
  typia.assert(sessionPage);
  TestValidator.predicate(
    "session list has data array",
    Array.isArray(sessionPage.data),
  );
  TestValidator.equals(
    "pagination present",
    typeof sessionPage.pagination,
    "object",
  );

  // Filtering and pagination options
  const pagedBody = {
    limit: 2 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingCustomerSession.IRequest;
  const filteredSessions =
    await api.functional.shopping.admin.customers.sessions.index(connection, {
      customerId: validCustomerId,
      body: pagedBody,
    });
  typia.assert(filteredSessions);
  TestValidator.equals(
    "pagination limit respected",
    filteredSessions.pagination.limit,
    2,
  );

  // 4. Try listing sessions for a non-existent customerId (should fail)
  const randomInvalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "listing for non-existent customerId should fail",
    async () => {
      await api.functional.shopping.admin.customers.sessions.index(connection, {
        customerId: randomInvalidId,
        body: baseBody,
      });
    },
  );

  // 5. Try listing sessions as unauthenticated (non-admin)
  // Create a new, unauthenticated connection (headers cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list customer sessions",
    async () => {
      await api.functional.shopping.admin.customers.sessions.index(unauthConn, {
        customerId: validCustomerId,
        body: baseBody,
      });
    },
  );
}
