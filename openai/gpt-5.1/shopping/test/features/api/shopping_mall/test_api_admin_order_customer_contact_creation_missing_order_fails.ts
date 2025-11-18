import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderCustomerContact } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCustomerContact";

/**
 * Verify that creating an order customer contact snapshot fails for a
 * non-existent order.
 *
 * ## Business intent
 *
 * This test ensures that the admin-only endpoint for creating a
 * `shopping_mall_order_customer_contacts` snapshot correctly enforces the
 * existence of the target order, even when the caller is a fully authenticated
 * administrator. When an admin attempts to create a customer contact snapshot
 * for an orderCode that does not exist in `shopping_mall_orders.order_code`,
 * the backend must reject the request with a not-found style error and must not
 * create any snapshot rows.
 *
 * ## High-level flow
 *
 * 1. Register a new admin with POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Construct a synthetic orderCode that should not exist in the database (e.g.,
 *    a high-entropy random string).
 * 3. Prepare a valid IShoppingMallOrderCustomerContact.ICreate payload
 *    representing a realistic customer contact snapshot.
 * 4. As the authenticated admin, call POST
 *    /shoppingMall/admin/orders/{orderCode}/customerContact with the
 *    non-existent orderCode and the valid payload.
 * 5. Assert that the operation fails by expecting an error from the SDK. We do not
 *    check the HTTP status code directly, but the presence of an error is
 *    treated as a not-found style failure semantics.
 *
 * ## Notes and constraints
 *
 * - The test must not manipulate `connection.headers` directly; the SDK handles
 *   token propagation after admin join.
 * - Only provided SDK functions are used; no customer-side GET endpoint is
 *   available to double-check the absence of snapshots, so the negative
 *   assertion relies purely on the error behavior of the create endpoint.
 * - All request bodies adhere strictly to the provided DTO definitions and use
 *   `satisfies` for type safety.
 */
export async function test_api_admin_order_customer_contact_creation_missing_order_fails(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin actor via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Omit ip to let the backend infer it if desired
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Construct a synthetic non-existent orderCode
  const missingOrderCode: string = `nonexistent-order-${RandomGenerator.alphaNumeric(24)}`;

  // 3. Prepare a valid customer contact snapshot payload
  const contactPayload = {
    contact_name: RandomGenerator.name(2),
    contact_email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderCustomerContact.ICreate;

  // 4. Attempt to create a snapshot for the non-existent order and expect failure
  await TestValidator.error(
    "creating customer contact snapshot for missing order must fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.customerContact.create(
        connection,
        {
          orderCode: missingOrderCode,
          body: contactPayload,
        },
      );
    },
  );
}
