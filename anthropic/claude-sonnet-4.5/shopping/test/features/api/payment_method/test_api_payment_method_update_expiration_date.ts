import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test updating a payment method's expiration date when a customer receives a
 * renewed card.
 *
 * This test validates the payment method expiration date update workflow, which
 * is essential for maintaining accurate payment information when customers
 * receive replacement cards with the same account number but new expiration
 * dates.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new customer account
 * 2. Create a billing address for the payment method
 * 3. Create a payment method with initial configuration
 * 4. Update the payment method with a new expiration date (simulating card
 *    renewal)
 * 5. Validate that the payment method ID and payment type remain unchanged
 * 6. Verify the update operation completes successfully
 */
export async function test_api_payment_method_update_expiration_date(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new customer account
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.auth.customer.join(connection, {
    body: customerData,
  });
  typia.assert(customer);

  // Step 2: Create a billing address for the payment method
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    country: "United States",
  } satisfies IShoppingMallAddress.ICreate;

  const address = await api.functional.shoppingMall.customer.addresses.create(
    connection,
    {
      body: addressData,
    },
  );
  typia.assert(address);

  // Step 3: Create a payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    gateway_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: paymentMethodData,
      },
    );
  typia.assert(paymentMethod);

  // Step 4: Update the payment method with a new expiration date (simulating card renewal)
  const newExpiryMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >() satisfies number as number;
  const newExpiryYear = 2028;

  const updateData = {
    card_expiry_month: newExpiryMonth,
    card_expiry_year: newExpiryYear,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updatedPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.update(
      connection,
      {
        methodId: paymentMethod.id,
        body: updateData,
      },
    );
  typia.assert(updatedPaymentMethod);

  // Step 5: Validate that the payment method ID remains unchanged
  TestValidator.equals(
    "payment method ID unchanged",
    updatedPaymentMethod.id,
    paymentMethod.id,
  );

  // Step 6: Validate that the payment type remains unchanged
  TestValidator.equals(
    "payment type unchanged",
    updatedPaymentMethod.payment_type,
    paymentMethod.payment_type,
  );
}
