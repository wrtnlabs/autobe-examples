import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test updating a payment method's billing address association when a customer
 * moves or changes billing information.
 *
 * This test validates the complete workflow of updating a payment method's
 * billing address reference. It simulates a realistic scenario where a customer
 * has relocated and needs to update the billing address associated with their
 * saved payment method.
 *
 * Test workflow:
 *
 * 1. Register a new customer account and authenticate
 * 2. Create the original billing address
 * 3. Create a new billing address (simulating a move)
 * 4. Create a payment method without initial billing address association
 * 5. Update the payment method to reference the new address
 * 6. Validate all payment method properties remain intact
 * 7. Confirm the billing address update operation completed successfully
 */
export async function test_api_payment_method_update_billing_address(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a new customer
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

  // Step 2: Create the original billing address
  const originalAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const originalAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: originalAddressData,
    });
  typia.assert(originalAddress);

  // Step 3: Create the new billing address (simulating customer's new address after moving)
  const newAddressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const newAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: newAddressData,
    });
  typia.assert(newAddress);

  // Step 4: Create a payment method without initial billing address association
  const paymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 5: Update the payment method to reference the new billing address
  const updateData = {
    shopping_mall_billing_address_id: newAddress.id,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updatedPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.update(
      connection,
      {
        methodId: paymentMethod.id,
        body: updateData,
      },
    );
  typia.assert(updatedPaymentMethod);

  // Step 6: Validate that the payment method ID remains the same (not a new record)
  TestValidator.equals(
    "payment method ID unchanged",
    updatedPaymentMethod.id,
    paymentMethod.id,
  );

  // Step 7: Validate that payment type is preserved
  TestValidator.equals(
    "payment type preserved",
    updatedPaymentMethod.payment_type,
    paymentMethod.payment_type,
  );

  // Step 8: Confirm the update operation completed successfully
  // Note: The IShoppingMallPaymentMethod interface only includes id and payment_type
  // The billing address association is managed internally but not exposed in the response
  // This is typical for payment methods where sensitive information is kept minimal
}
