import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Verify that only admin-authenticated actors can create payment methods.
 *
 * Business goal:
 *
 * - Ensure POST /shoppingMall/admin/paymentMethods is protected so that
 *   unauthenticated clients and non-admin actors (customers) cannot create
 *   payment method configurations.
 *
 * Scenario overview:
 *
 * 1. Construct a valid IShoppingMallPaymentMethod.ICreate payload which would
 *    succeed if called by an authorized admin.
 * 2. Scenario #1 (unauthenticated):
 *
 *    - Use a fresh connection object without any Authorization header.
 *    - Call the admin payment method creation endpoint with the valid body.
 *    - Assert that the call fails (authorization error expected).
 * 3. Scenario #2 (customer-authenticated):
 *
 *    - Register a customer via POST /auth/customer/join which automatically sets a
 *         customer access token on the base connection.
 *    - With this customer-authenticated connection, call the admin payment method
 *         creation endpoint using the same valid payload.
 *    - Assert that this call also fails due to insufficient privileges.
 *
 * Note:
 *
 * - We do not assert specific HTTP status codes; we only verify that an error
 *   occurs when authorization is missing or insufficient.
 * - We do not verify persistence/non-creation by listing payment methods, because
 *   no listing endpoint is provided. The test focuses on authorization behavior
 *   around the create endpoint.
 */
export async function test_api_admin_payment_method_creation_requires_admin_auth(
  connection: api.IConnection,
) {
  // Helper to build a valid payment method creation payload.
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_type: RandomGenerator.paragraph({ sentences: 1 }),
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  // -----------------------------------------------------------------------
  // Scenario #1: Unauthenticated caller cannot create payment methods
  // -----------------------------------------------------------------------
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated cannot create payment method",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.create(
        unauthConnection,
        {
          body: paymentMethodBody,
        },
      );
    },
  );

  // -----------------------------------------------------------------------
  // Scenario #2: Customer-authenticated caller cannot create payment methods
  // -----------------------------------------------------------------------
  // Join as a customer to set a customer JWT on the base connection.
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

  await TestValidator.error(
    "customer cannot create admin payment method",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.create(
        connection,
        {
          body: paymentMethodBody,
        },
      );
    },
  );
}
