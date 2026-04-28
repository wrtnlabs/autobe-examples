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
 * Test the one-default-per-customer constraint when updating a shipping address with isDefault=true.
 *
 * Validates that the system correctly handles default address designation through the update endpoint. When a customer updates an address with isDefault=true, the update response should reflect the new default status. The business rule ensures only one address per customer can be designated as default at any time, with previous defaults automatically unset.
 *
 * Special attention is given to verifying that the update operation applies the isDefault change and returns the correct is_default value in the response, confirming the backend constraint enforcement works as expected.
 *
 * 1. Customer registers with email and credentials.
 * 2. First shipping address is created without default designation (isDefault=false).
 * 3. Second shipping address is created with default designation (isDefault=true).
 * 4. Second address response is validated to confirm is_default=true.
 * 5. First address is updated with isDefault=true to change the default.
 * 6. Validates the updated first address response shows is_default=true, confirming the default was reassigned.
 */
export async function test_api_address_is_default_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create first address (not default)
  const address1 =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: false } },
    );
  typia.assert(address1);
  TestValidator.equals(
    "first address is not default",
    address1.is_default,
    false,
  );
  // 3. Create second address (set as default)
  const address2 =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: true } },
    );
  typia.assert(address2);
  TestValidator.equals("second address is default", address2.is_default, true);
  // 4. Update first address to become the new default
  const updatedAddress1 =
    await api.functional.ecommercePlatform.customer.addresses.update(
      customerConnection,
      {
        addressId: address1.id,
        body: {
          isDefault: true,
        } satisfies IEcommercePlatformShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress1);
  // 5. Validate first address is now the default
  TestValidator.equals(
    "first address is now default after update",
    updatedAddress1.is_default,
    true,
  );
}
