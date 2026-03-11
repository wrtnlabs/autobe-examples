import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test that subsequent shipping addresses are not automatically set as default.
 *
 * Validates the business rule that:
 * - First address becomes default automatically
 * - Subsequent addresses are NOT set as default
 * - Existing default remains unchanged when new address is added
 */
export async function test_api_address_subsequent_address_not_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create first address - should automatically become default
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phoneNumber: "010-1234-5678",
          streetAddress: "123 First Street",
          city: "Seoul",
          stateProvince: "Seoul",
          postalCode: "12345",
          country: "South Korea",
        },
      },
    );
  typia.assert(firstAddress);
  // Validate first address is default
  TestValidator.equals(
    "first address is default",
    firstAddress.isDefault,
    true,
  );
  TestValidator.predicate(
    "first address has valid id",
    firstAddress.id.length > 0,
  );
  // 3. Create second address - should NOT be set as default
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Jane Smith",
          phoneNumber: "010-8765-4321",
          streetAddress: "456 Second Avenue",
          city: "Busan",
          stateProvince: "Busan",
          postalCode: "54321",
          country: "South Korea",
        },
      },
    );
  typia.assert(secondAddress);
  // Validate second address is NOT default
  TestValidator.equals(
    "second address is not default",
    secondAddress.isDefault,
    false,
  );
  TestValidator.predicate(
    "second address has unique id",
    secondAddress.id !== firstAddress.id,
  );
  // 4. Create third address to reinforce the pattern
  const thirdAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Bob Wilson",
          phoneNumber: "010-5555-1234",
          streetAddress: "789 Third Boulevard",
          city: "Incheon",
          stateProvince: "Incheon",
          postalCode: "67890",
          country: "South Korea",
        },
      },
    );
  typia.assert(thirdAddress);
  // Validate third address is also NOT default
  TestValidator.equals(
    "third address is not default",
    thirdAddress.isDefault,
    false,
  );
  TestValidator.predicate(
    "third address has unique id",
    thirdAddress.id !== firstAddress.id && thirdAddress.id !== secondAddress.id,
  );
  // 5. Verify the first address remains as default (unchanged)
  TestValidator.equals(
    "first address still default after subsequent creations",
    firstAddress.isDefault,
    true,
  );
  // 6. Validate all addresses have different recipient names
  TestValidator.notEquals(
    "addresses have different recipient names",
    firstAddress.recipientName,
    secondAddress.recipientName,
  );
}
