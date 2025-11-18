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
 * Verify that deleting a payment method is restricted to admin actors and
 * cannot be performed by authenticated customers.
 *
 * Business context: Payment methods are global checkout configurations managed
 * exclusively by shopping mall administrators. The DELETE
 * /shoppingMall/admin/paymentMethods/{paymentMethodCode} endpoint is documented
 * as `authorizationActor: "admin"`, so any attempt from a customer token (or
 * anonymous client) must be rejected. Only admins are allowed to remove these
 * configurations.
 *
 * Test steps:
 *
 * 1. Join as an admin to obtain an admin-authenticated connection.
 * 2. Using the admin token, create a payment method via the admin create endpoint.
 * 3. Join as a customer so that the shared connection now carries a customer
 *    token.
 * 4. As the customer, attempt to erase the admin payment method; assert that this
 *    call fails with an HTTP error using TestValidator.error.
 * 5. Join as an admin again to restore an admin token on the connection.
 * 6. As the admin, call erase for the same payment method code and assert that the
 *    call completes successfully (no error thrown).
 *
 * This test does not verify HTTP status codes or response bodies of the error
 * cases and does not re-read the payment method after deletion, because there
 * is no list/read API in the provided SDK. Instead, it focuses purely on
 * actor-based authorization behavior of the erase endpoint.
 */
export async function test_api_admin_payment_method_delete_requires_admin_auth(
  connection: api.IConnection,
) {
  // Step 1: Join as admin to get an admin-authenticated connection
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuth);

  // Step 2: Create a payment method as admin
  const paymentMethodCreateBody =
    typia.random<IShoppingMallPaymentMethod.ICreate>();
  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(createdPaymentMethod);

  const paymentMethodCode: string = createdPaymentMethod.code;

  // Step 3: Join as customer so that the connection now bears a customer token
  const customerJoinInput = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuth);

  // Step 4: As customer, attempting to erase the payment method must fail
  await TestValidator.error(
    "customer must not be able to delete admin payment method",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.erase(connection, {
        paymentMethodCode,
      });
    },
  );

  // Step 5: Re-join as admin to restore admin token on the connection
  const secondAdminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const secondAdminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminJoinInput,
    });
  typia.assert(secondAdminAuth);

  // Step 6: As admin, deletion should now succeed without throwing
  await api.functional.shoppingMall.admin.paymentMethods.erase(connection, {
    paymentMethodCode,
  });
}
