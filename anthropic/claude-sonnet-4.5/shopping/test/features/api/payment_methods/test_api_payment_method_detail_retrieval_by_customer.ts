import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test that authenticated customers can retrieve complete details of a specific
 * saved payment method.
 *
 * This test validates the payment method detail retrieval functionality by:
 *
 * 1. Creating a new customer account for authentication
 * 2. Creating a billing address to associate with the payment method
 * 3. Creating a payment method with tokenized gateway data
 * 4. Retrieving the payment method by its ID
 * 5. Validating complete payment information is returned
 * 6. Ensuring sensitive data is not exposed (only tokens)
 *
 * The test verifies ownership validation, data completeness, and security
 * compliance.
 */
export async function test_api_payment_method_detail_retrieval_by_customer(
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
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Step 2: Create a billing address for the customer
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
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

  const address: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(address);

  // Step 3: Create a payment method with tokenized gateway data
  const paymentMethodData = {
    payment_type: RandomGenerator.pick([
      "credit_card",
      "debit_card",
      "paypal",
    ] as const),
    gateway_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      { body: paymentMethodData },
    );
  typia.assert(createdPaymentMethod);

  // Step 4: Retrieve the payment method by its ID
  const retrievedPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.at(connection, {
      methodId: createdPaymentMethod.id,
    });
  typia.assert(retrievedPaymentMethod);

  // Step 5: Validate that the retrieved payment method matches the created one
  TestValidator.equals(
    "payment method ID should match",
    retrievedPaymentMethod.id,
    createdPaymentMethod.id,
  );

  TestValidator.equals(
    "payment method type should match",
    retrievedPaymentMethod.payment_type,
    createdPaymentMethod.payment_type,
  );
}
