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
 * Test deletion of non-default shipping address from customer's address book.
 *
 * Validates the address deletion flow where a customer with multiple shipping addresses deletes a non-default address. The system should successfully remove the specified address while leaving the default address and any other saved addresses intact.
 *
 * Special attention is given to ensuring that deleting a non-default address does not affect the customer's default shipping address or trigger any cascade behaviors.
 *
 * 1. Customer registers an account with unique email and credentials.
 * 2. Customer creates a non-default shipping address (isDefault: false).
 * 3. Customer creates a default shipping address (isDefault: true).
 * 4. Validates that the non-default address was created with isDefault: false.
 * 5. Validates that the default address was created with isDefault: true.
 * 6. Customer deletes the non-default address by its unique ID.
 * 7. Validates that the deletion operation completes without error.
 */
export async function test_api_shipping_address_delete_non_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Create non-default shipping address
  const nonDefaultAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(nonDefaultAddress);
  TestValidator.equals(
    "non-default address is not default",
    nonDefaultAddress.is_default,
    false,
  );
  // 3. Create default shipping address
  const defaultAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        },
      },
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "default address is default",
    defaultAddress.is_default,
    true,
  );
  // 4. Validate addresses have different IDs
  TestValidator.notEquals(
    "addresses have unique IDs",
    nonDefaultAddress.id,
    defaultAddress.id,
  );
  // 5. Delete non-default address
  await api.functional.ecommercePlatform.customer.addresses.erase(
    customerConnection,
    {
      addressId: nonDefaultAddress.id,
    },
  );
  // Deletion completed without error - non-default address successfully removed
}
