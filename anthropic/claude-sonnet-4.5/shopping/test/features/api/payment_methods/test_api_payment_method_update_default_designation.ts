import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test changing the default payment method designation by updating a
 * non-default payment method.
 *
 * This test validates the default payment method update operation. When a
 * customer updates a payment method's is_default flag to true, the operation
 * should succeed and return the updated payment method information.
 *
 * Note: Full validation of the atomic default status transfer (verifying the
 * previous default method loses its status) cannot be implemented because:
 *
 * 1. No GET endpoint available to retrieve individual payment method details
 * 2. IShoppingMallPaymentMethod response type doesn't expose the is_default
 *    property
 *
 * Test Flow:
 *
 * 1. Create a new customer account
 * 2. Create a billing address for payment methods
 * 3. Create first payment method (automatically becomes default)
 * 4. Create second payment method (remains non-default)
 * 5. Update second payment method to become default
 * 6. Validate update operation succeeds
 */
export async function test_api_payment_method_update_default_designation(
  connection: api.IConnection,
) {
  // Step 1: Create new customer account
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

  // Step 2: Create billing address required for payment methods
  const addressData = {
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

  const billingAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(billingAddress);

  // Step 3: Create first payment method (automatically becomes default since it's the first)
  const firstPaymentMethodData = {
    payment_type: RandomGenerator.pick(["credit_card", "debit_card"] as const),
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: firstPaymentMethodData,
      },
    );
  typia.assert(firstPaymentMethod);

  // Step 4: Create second payment method (remains non-default)
  const secondPaymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
    gateway_token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const secondPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: secondPaymentMethodData,
      },
    );
  typia.assert(secondPaymentMethod);

  // Step 5: Update the second payment method to become the default
  const updateData = {
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updatedSecondMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.update(
      connection,
      {
        methodId: secondPaymentMethod.id,
        body: updateData,
      },
    );
  typia.assert(updatedSecondMethod);

  // Step 6: Validate that the update operation succeeded
  TestValidator.equals(
    "updated payment method ID matches",
    updatedSecondMethod.id,
    secondPaymentMethod.id,
  );

  TestValidator.equals(
    "updated payment method type preserved",
    updatedSecondMethod.payment_type,
    secondPaymentMethod.payment_type,
  );
}
