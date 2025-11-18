import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCaseSlaViolation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaViolation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Verify that the admin-only SLA violation search endpoint cannot be invoked
 * without an admin token, both for anonymous and customer-authenticated
 * callers.
 *
 * Business intent
 *
 * - /shoppingMall/admin/caseSlaViolations is restricted to administrator actors.
 * - Anonymous callers must not be able to retrieve SLA violation data.
 * - Customer-authenticated sessions (non-admin) must also be blocked from
 *   querying SLA violations, to prevent leakage of operational governance
 *   data.
 *
 * Steps
 *
 * 1. Build a minimal, valid search request body for SLA violations using
 *    IShoppingMallCaseSlaViolation.IRequest. Because all properties on this DTO
 *    are optional, an empty object literal is a valid request body.
 * 2. Create an unauthenticated connection by shallow-cloning the provided
 *    connection and overriding headers with an empty object. Do not touch that
 *    headers object afterwards; the SDK will not attach any token to it.
 * 3. Using the anonymous connection, attempt to call
 *    api.functional.shoppingMall.admin.caseSlaViolations.index with the minimal
 *    body inside TestValidator.error, asserting that an error occurs. Do not
 *    assert HTTP status codes or error payloads; just validate that the call
 *    does not succeed.
 * 4. On the original connection, execute a customer join via
 *    api.functional.auth.customer.join with a randomly generated
 *    IShoppingMallCustomerJoin.IRequest payload. typia.assert the returned
 *    IShoppingMallCustomer.IAuthorized to validate the structure. This call
 *    will attach a customer Authorization token to connection.headers.
 * 5. With the now customer-authenticated connection, again attempt to call
 *    api.functional.shoppingMall.admin.caseSlaViolations.index using the same
 *    minimal request body, wrapped in TestValidator.error. This confirms that
 *    even with a valid but non-admin token, the call fails.
 * 6. Do not perform any admin join or successful SLA search in this test; the
 *    focus is strictly on unauthorized and role-mismatched access behavior.
 */
export async function test_api_case_sla_violations_search_unauthorized_without_admin_token(
  connection: api.IConnection,
) {
  // 1. Minimal, valid SLA violation search request body (all fields optional)
  const requestBody = {
    // All properties in IShoppingMallCaseSlaViolation.IRequest are optional,
    // so an empty object is a valid search criteria payload.
  } satisfies IShoppingMallCaseSlaViolation.IRequest;

  // 2. Anonymous (unauthenticated) connection: clone with empty headers
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Anonymous caller must not be able to search SLA violations
  await TestValidator.error(
    "anonymous connection cannot search SLA violations",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaViolations.index(
        anonymousConnection,
        { body: requestBody },
      );
    },
  );

  // 4. Register a customer on the original connection to obtain a customer token
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional and can be omitted entirely.
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. Customer-authenticated caller must also be blocked from SLA search
  await TestValidator.error(
    "customer-authenticated connection cannot search admin SLA violations",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaViolations.index(
        connection,
        { body: requestBody },
      );
    },
  );
}
