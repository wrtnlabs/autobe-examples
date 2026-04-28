import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test address retrieval after default designation is switched to another address.
 *
 * Validates the one-default-per-customer constraint where creating a new default address automatically revokes the default status from the previously designated address. Ensures that the original address remains intact with all geographic details preserved, but its is_default flag is correctly updated to false.
 *
 * This test verifies the automatic default status rollback mechanism and confirms that retrieving an address by ID returns the updated state reflecting the business rule enforcement.
 *
 * 1. Register a new customer account for authentication context.
 * 2. Create the first shipping address and designate it as the default.
 * 3. Create a second shipping address and designate it as the new default, triggering automatic default revocation on the first.
 * 4. Retrieve the first address by its unique identifier.
 * 5. Verify the first address's is_default is now false while preserving all original details.
 */
export async function test_api_address_retrieval_default_switched(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Create first shipping address as default
  const firstAddress =
    await api.functional.ecommercePlatform.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphabets(5),
          country: RandomGenerator.name(1),
          isDefault: true,
        } satisfies IEcommercePlatformShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  // 3. Create second shipping address as new default (triggers default switch)
  const secondAddress =
    await api.functional.ecommercePlatform.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphabets(5),
          country: RandomGenerator.name(1),
          isDefault: true,
        } satisfies IEcommercePlatformShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  // 4. Retrieve the first address by its ID
  const retrievedFirstAddress =
    await api.functional.ecommercePlatform.customer.addresses.at(
      customerConnection,
      { addressId: firstAddress.id },
    );
  typia.assert(retrievedFirstAddress);
  // 5. Validate: first address should no longer be default
  TestValidator.equals(
    "first address is no longer default",
    retrievedFirstAddress.is_default,
    false,
  );
  // Verify original geographic details are preserved
  TestValidator.equals(
    "recipient name preserved",
    retrievedFirstAddress.recipient_name,
    firstAddress.recipient_name,
  );
  TestValidator.equals(
    "street address preserved",
    retrievedFirstAddress.street_address,
    firstAddress.street_address,
  );
  TestValidator.equals(
    "city preserved",
    retrievedFirstAddress.city,
    firstAddress.city,
  );
  TestValidator.equals(
    "country preserved",
    retrievedFirstAddress.country,
    firstAddress.country,
  );
}
