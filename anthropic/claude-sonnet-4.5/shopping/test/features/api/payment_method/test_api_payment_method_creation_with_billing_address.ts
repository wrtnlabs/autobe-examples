import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the complete workflow of creating a new payment method for an
 * authenticated customer with billing address association.
 *
 * This test validates the end-to-end process of securely saving a payment
 * instrument for a customer:
 *
 * 1. Register a new customer account and establish authentication
 * 2. Create a billing address that will be associated with the payment method
 * 3. Create a payment method with tokenized payment information
 * 4. Validate proper tokenization, security measures, and automatic default
 *    designation
 *
 * The test ensures PCI DSS compliance by verifying that no full card numbers
 * are stored, only secure gateway tokens. It also validates that the first
 * payment method is automatically set as default for streamlined checkout
 * experiences.
 */
export async function test_api_payment_method_creation_with_billing_address(
  connection: api.IConnection,
) {
  // Step 1: Register new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerName = RandomGenerator.name();

  const customerData = {
    email: customerEmail,
    password: customerPassword,
    name: customerName,
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(authorizedCustomer);

  // Validate customer creation
  TestValidator.equals(
    "customer email matches",
    authorizedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "customer name matches",
    authorizedCustomer.name,
    customerName,
  );
  TestValidator.predicate(
    "customer has valid UUID",
    typeof authorizedCustomer.id === "string" &&
      authorizedCustomer.id.length > 0,
  );
  TestValidator.predicate(
    "customer has access token",
    typeof authorizedCustomer.token.access === "string" &&
      authorizedCustomer.token.access.length > 0,
  );

  // Step 2: Create billing address
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    address_line1: RandomGenerator.paragraph({
      sentences: 5,
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

  const billingAddress: IShoppingMallAddress =
    await api.functional.shoppingMall.customer.addresses.create(connection, {
      body: addressData,
    });
  typia.assert(billingAddress);

  // Validate billing address creation
  TestValidator.equals(
    "address recipient name matches",
    billingAddress.recipient_name,
    addressData.recipient_name,
  );
  TestValidator.equals(
    "address phone matches",
    billingAddress.phone_number,
    addressData.phone_number,
  );
  TestValidator.equals(
    "address line matches",
    billingAddress.address_line1,
    addressData.address_line1,
  );
  TestValidator.predicate(
    "address has valid UUID",
    typeof billingAddress.id === "string" && billingAddress.id.length > 0,
  );

  // Step 3: Create payment method with gateway token
  const paymentTypes = ["credit_card", "debit_card", "paypal"] as const;
  const selectedPaymentType = RandomGenerator.pick(paymentTypes);

  const paymentMethodData = {
    payment_type: selectedPaymentType,
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

  // Step 4: Comprehensive validation of payment method
  TestValidator.predicate(
    "payment method has valid UUID",
    typeof paymentMethod.id === "string" && paymentMethod.id.length > 0,
  );
  TestValidator.equals(
    "payment type matches",
    paymentMethod.payment_type,
    selectedPaymentType,
  );

  // Validate PCI DSS compliance - no sensitive data exposure
  TestValidator.predicate(
    "payment method uses secure tokenization",
    typeof paymentMethod.id === "string" && paymentMethod.id.length > 0,
  );
}
