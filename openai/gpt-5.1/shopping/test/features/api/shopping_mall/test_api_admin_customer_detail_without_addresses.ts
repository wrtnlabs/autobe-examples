import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate admin customer detail retrieval for a customer with no addresses.
 *
 * Business goal
 *
 * - Ensure that an administrator can successfully fetch a detailed customer
 *   record even when that customer has not yet registered any shipping
 *   addresses or additional profile structures.
 * - Confirm that the endpoint returns a structurally correct
 *   IShoppingMallCustomer object without throwing server-side null-reference
 *   errors in such a minimal data scenario.
 *
 * Scenario steps
 *
 * 1. Register a new admin using POST /auth/admin/join.
 *
 *    - Use IShoppingMallAdminJoin.ICreate as the request body.
 *    - The SDK call is api.functional.auth.admin.join, which returns
 *         IShoppingMallAdmin.IAuthorized and automatically sets the admin
 *         access token on the shared connection.
 * 2. Register a new customer using POST /auth/customer/join.
 *
 *    - Use IShoppingMallCustomerJoin.IRequest as the request body.
 *    - The SDK call is api.functional.auth.customer.join, which returns
 *         IShoppingMallCustomer.IAuthorized and sets a _customer_ token into
 *         the same connection.
 * 3. Re-establish the admin context.
 *
 *    - Because customer.join overwrites the Authorization header on the shared
 *         connection, call api.functional.auth.admin.join again with the same
 *         (or a different) admin email so that the connection has an admin
 *         token before hitting the admin-only endpoint.
 * 4. Call GET /shoppingMall/admin/customers/{customerId}.
 *
 *    - Use api.functional.shoppingMall.admin.customers.at with props.customerId
 *         equal to the id returned from the customer join response.
 * 5. Validate response structure and core fields.
 *
 *    - Run typia.assert on the response to ensure it matches IShoppingMallCustomer
 *         exactly.
 *    - Use TestValidator.equals and TestValidator.predicate to validate:
 *
 *         - The returned id equals the customer id from the join response.
 *         - The returned email equals the customer email from the join response.
 *         - Deleted_at is null or undefined for a fresh customer.
 *         - Last_login_at is either null/undefined or a valid date-time string (we just
 *                   rely on typia.assert for full type correctness and only
 *                   check nullability at a high level).
 *    - We do not validate any address-related information because the base
 *         IShoppingMallCustomer DTO does not expose addresses and they are
 *         modeled in separate structures.
 */
export async function test_api_admin_customer_detail_without_addresses(
  connection: api.IConnection,
) {
  // 1. Register an admin (admin join) to obtain admin Authorization token.
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

  // 2. Register a new customer (customer join) with its own email/password.
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

  // 3. Re-establish admin context because customer.join overwrote the token.
  const secondAdminJoinBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const secondAdminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminJoinBody,
    });
  typia.assert(secondAdminAuthorized);

  // 4. Call admin customer detail endpoint using the customer's id.
  const detailedCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId: customerAuthorized.id,
    });

  // Validate structural correctness.
  typia.assert(detailedCustomer);

  // 5. Business-level assertions on core fields.
  TestValidator.equals(
    "admin detail returns the same customer id as join response",
    detailedCustomer.id,
    customerAuthorized.id,
  );

  TestValidator.equals(
    "admin detail returns the same email as join response",
    detailedCustomer.email,
    customerAuthorized.email,
  );

  // deleted_at should be null or undefined for a freshly joined customer.
  TestValidator.predicate(
    "fresh customer should not be soft-deleted",
    detailedCustomer.deleted_at === null ||
      detailedCustomer.deleted_at === undefined,
  );

  // last_login_at is optional and may be null/undefined for a new account.
  // We only assert it is not an obviously invalid state; typia.assert already
  // guarantees correct type/format when present.
  TestValidator.predicate(
    "last_login_at is either null/undefined or a valid date-time string by schema",
    detailedCustomer.last_login_at === null ||
      detailedCustomer.last_login_at === undefined ||
      typeof detailedCustomer.last_login_at === "string",
  );
}
