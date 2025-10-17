import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the complete workflow of a customer deleting a saved payment method.
 *
 * This test validates that a customer can successfully remove a saved payment
 * method from their account. The workflow includes:
 *
 * 1. Customer registration and authentication
 * 2. Creating a billing address
 * 3. Creating a saved payment method
 * 4. Deleting the payment method
 * 5. Verifying the deletion succeeded
 */
export async function test_api_payment_method_deletion_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Step 2: Create a billing address for the customer
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 6,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia.random<
      string & tags.MinLength<5> & tags.MaxLength<10>
    >(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 3: Create a saved payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Delete the payment method
  await api.functional.shoppingMall.customer.paymentMethods.erase(connection, {
    methodId: paymentMethod.id,
  });

  // Step 5: Verification - deletion returns void, so successful execution means success
  // No exception thrown indicates the payment method was successfully deleted
}
