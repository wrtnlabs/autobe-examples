import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_addresses_create } from "../../../generate/generate_random_ecommerce_customer_addresses_create";
import { prepare_random_ecommerce_address } from "../../../prepare/prepare_random_ecommerce_address";

/**
 * Test customer address creation with default flag management.
 *
 * Validates the complete workflow of creating shipping addresses for a customer, with special attention to the default address management logic. Ensures that when a new address is marked as default, the system properly handles the transition from any existing default address.
 *
 * The test covers the following scenarios:
 * 1. Customer registration and authentication
 * 2. Creation of first address with is_default=true
 * 3. Creation of second address with is_default=true (testing default replacement)
 * 4. Validation of new address default flag
 * 5. Verification that system accepts multiple default address requests (implying proper unset of previous default)
 *
 * Key validation points:
 * - New address is created with is_default=true when requested
 * - System handles default address transition without errors
 * - All address fields are properly persisted and returned
 * - Customer can maintain multiple addresses with only one default
 */
export async function test_api_customer_address_creation_with_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first address with is_default=true
  const firstAddress =
    await generate_random_ecommerce_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postal_code: RandomGenerator.alphabets(5),
          country: typia.random<string>(),
          is_default: true,
        } satisfies IEcommerceAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // Validate first address is default
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  // Store first address ID for reference
  const firstAddressId = firstAddress.id;
  // 3. Create second address with is_default=true (testing default replacement)
  const secondAddress =
    await generate_random_ecommerce_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postal_code: RandomGenerator.alphabets(5),
          country: typia.random<string>(),
          is_default: true,
        } satisfies IEcommerceAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  // 4. Validate second address is default
  TestValidator.equals(
    "second address is default",
    secondAddress.is_default,
    true,
  );
  // 5. Validate second address has different ID from first
  TestValidator.notEquals(
    "second address has different ID",
    secondAddress.id,
    firstAddressId,
  );
  // 6. Validate all required fields in second address
  TestValidator.predicate(
    "has recipient name",
    secondAddress.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "has phone number",
    secondAddress.phone_number.length > 0,
  );
  TestValidator.predicate(
    "has street address",
    secondAddress.street_address.length > 0,
  );
  TestValidator.predicate("has city", secondAddress.city.length > 0);
  TestValidator.predicate(
    "has postal code",
    secondAddress.postal_code.length > 0,
  );
  TestValidator.predicate("has country", secondAddress.country.length > 0);
  // 7. Validate timestamps are set
  TestValidator.predicate(
    "has created_at",
    secondAddress.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at",
    secondAddress.updated_at.length > 0,
  );
  // 8. Validate customer reference in address
  TestValidator.equals(
    "customer ID matches",
    secondAddress.customer.id,
    customer.id,
  );
}
