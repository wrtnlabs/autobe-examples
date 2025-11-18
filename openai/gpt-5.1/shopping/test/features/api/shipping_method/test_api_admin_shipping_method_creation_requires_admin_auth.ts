import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Verify that creating a shipping method is restricted to admin-authenticated
 * actors and that unauthenticated or customer-authenticated attempts fail
 * without persisting configuration records.
 *
 * Business context:
 *
 * - Shipping methods are platform-level configuration objects stored in
 *   `shopping_mall_shipping_methods` and used during checkout and fulfillment.
 * - The creation endpoint `POST /shoppingMall/admin/shippingMethods` is
 *   explicitly documented as an admin-only operation.
 * - Public consumers can read shipping methods via `GET
 *   /shoppingMall/shippingMethods/{methodCode}`.
 *
 * Test steps:
 *
 * 1. Prepare a unique shipping method code and a valid
 *    `IShoppingMallShippingMethod.ICreate` body.
 * 2. Attempt to create a shipping method without any Authorization header using a
 *    cloned unauthenticated connection, and assert that an error is thrown.
 * 3. Register a customer via `POST /auth/customer/join` so the main connection
 *    carries a customer JWT, then attempt the admin shipping method creation
 *    again and assert that an error is thrown.
 * 4. Register an admin via `POST /auth/admin/join` so the main connection carries
 *    an admin JWT, then successfully create the shipping method and assert the
 *    response type and key fields.
 * 5. Fetch the created shipping method via `GET
 *    /shoppingMall/shippingMethods/{methodCode}` and assert that it matches the
 *    created record.
 */
export async function test_api_admin_shipping_method_creation_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare unique shipping method code and valid create body
  const methodCode: string = `test-${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    method_code: methodCode,
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    service_level_description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  // 2. Unauthenticated attempt: clone connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client cannot create admin shipping method",
    async () => {
      await api.functional.shoppingMall.admin.shippingMethods.create(
        unauthenticatedConnection,
        {
          body: createBody,
        },
      );
    },
  );

  // 3. Customer-authenticated attempt: join as customer to get customer JWT
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Let the backend derive IP when omitted; href/referrer are required.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  await TestValidator.error(
    "customer actor cannot create admin shipping method",
    async () => {
      await api.functional.shoppingMall.admin.shippingMethods.create(
        connection,
        {
          body: createBody,
        },
      );
    },
  );

  // 4. Admin-authenticated success: join as admin to override Authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const created: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  TestValidator.equals(
    "created method_code matches request",
    created.method_code,
    createBody.method_code,
  );
  TestValidator.equals(
    "created display_name matches request",
    created.display_name,
    createBody.display_name,
  );

  // 5. Fetch via public GET to confirm persistence
  const fetched: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode: methodCode,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "fetched shipping method matches created one",
    fetched.method_code,
    created.method_code,
  );
  TestValidator.equals(
    "fetched display_name matches created one",
    fetched.display_name,
    created.display_name,
  );
}
