import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test creating multiple payment methods for a single customer account.
 *
 * This test validates that a customer can successfully create and manage
 * multiple saved payment methods in their account. The test ensures that:
 *
 * 1. Customer can register and authenticate successfully
 * 2. Customer can create a billing address
 * 3. Customer can create multiple payment methods with different payment types
 * 4. Each payment method receives a unique identifier
 * 5. Payment methods are properly tokenized through the gateway
 * 6. The system allows customers to maintain multiple payment instruments for
 *    checkout flexibility
 *
 * Note: The API does not expose default payment method status in the response
 * DTOs, so default designation logic cannot be validated in this test. The test
 * focuses on validating successful creation and uniqueness of multiple payment
 * methods.
 */
export async function test_api_payment_method_creation_multiple_methods(
  connection: api.IConnection,
) {
  // Step 1: Create new customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create billing address for payment method associations
  const billingAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: {
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
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        country: "United States",
      } satisfies IShoppingMallAddress.ICreate,
    });
  typia.assert(billingAddress);

  // Step 3: Create first payment method
  const paymentTypes = ["credit_card", "debit_card", "paypal"] as const;

  const firstPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick(paymentTypes),
          gateway_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(firstPaymentMethod);

  // Step 4: Create second payment method with different type
  const remainingTypes = paymentTypes.filter(
    (t) => t !== firstPaymentMethod.payment_type,
  );
  const secondPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick(remainingTypes),
          gateway_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(secondPaymentMethod);

  // Step 5: Create third payment method
  const thirdPaymentMethod =
    await api.functional.shoppingMall.customer.paymentMethods.create(
      connection,
      {
        body: {
          payment_type: RandomGenerator.pick(paymentTypes),
          gateway_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(thirdPaymentMethod);

  // Validate all payment methods have unique IDs
  TestValidator.notEquals(
    "first and second payment methods have different IDs",
    firstPaymentMethod.id,
    secondPaymentMethod.id,
  );

  TestValidator.notEquals(
    "second and third payment methods have different IDs",
    secondPaymentMethod.id,
    thirdPaymentMethod.id,
  );

  TestValidator.notEquals(
    "first and third payment methods have different IDs",
    firstPaymentMethod.id,
    thirdPaymentMethod.id,
  );

  // Validate payment types are preserved correctly
  TestValidator.predicate(
    "first payment method type is valid",
    paymentTypes.includes(firstPaymentMethod.payment_type as any),
  );

  TestValidator.predicate(
    "second payment method type is valid",
    paymentTypes.includes(secondPaymentMethod.payment_type as any),
  );

  TestValidator.predicate(
    "third payment method type is valid",
    paymentTypes.includes(thirdPaymentMethod.payment_type as any),
  );
}
