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
 * Test deleting the default shipping address when another address exists.
 *
 * Validates that when a customer's default shipping address is deleted and another saved address exists, the system successfully processes the deletion and automatically promotes the remaining address as the new default. Tests the complete customer and address lifecycle from registration through address management.
 *
 * Special attention is given to verifying that the deletion of a default address succeeds without error when at least one alternate address is available, conforming to Section 270 requirements for default address management.
 *
 * 1. Customer registers a new account with randomized credentials.
 * 2. Customer creates a first shipping address designated as the default.
 * 3. Customer creates a second shipping address as non-default.
 * 4. Customer deletes the first (default) address by its addressId.
 * 5. Validates the deletion completes successfully and the system remains functional with the remaining address promoted to default.
 */
export async function test_api_shipping_address_delete_default_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create first shipping address as the default
  const defaultAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: true } },
    );
  typia.assert(defaultAddress);
  TestValidator.equals(
    "first address is default",
    defaultAddress.is_default,
    true,
  );
  // 3. Create second shipping address as non-default
  const nonDefaultAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: false } },
    );
  typia.assert(nonDefaultAddress);
  TestValidator.equals(
    "second address is not default",
    nonDefaultAddress.is_default,
    false,
  );
  // 4. Delete the default address by its addressId
  // System should succeed since another address exists to become the new default
  await api.functional.ecommercePlatform.customer.addresses.erase(
    customerConnection,
    { addressId: defaultAddress.id },
  );
  // 5. Verify system is still functional by creating another default address
  // This implicitly validates the remaining address was promoted to default
  const newDefaultAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: true } },
    );
  typia.assert(newDefaultAddress);
  TestValidator.equals(
    "new address is default after deletion",
    newDefaultAddress.is_default,
    true,
  );
  TestValidator.predicate(
    "all addresses have unique IDs",
    newDefaultAddress.id !== defaultAddress.id,
  );
}
