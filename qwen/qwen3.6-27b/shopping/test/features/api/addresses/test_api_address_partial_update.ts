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
 * Test partial update of an existing shipping address.
 *
 * Validates that a customer can modify multiple fields of their shipping address including recipient name, street address, city, and postal code. The update is partial - only provided fields are updated while unspecified fields retain their original values.
 *
 * Special attention is given to verifying that the updated_at timestamp changes after modification and that the address ownership is properly maintained through the customer profile relation.
 *
 * 1. Register and authenticate as a customer.
 * 2. Create a shipping address with initial recipient name, address details, and default status.
 * 3. Partially update the address modifying recipient name, street address, city, and postal code while leaving other fields unchanged.
 * 4. Validate that updated fields reflect the new values, non-updated fields remain intact, ownership is maintained, and updated_at timestamp has changed.
 */
export async function test_api_address_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
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
  // 2. Create a shipping address for the customer
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: { isDefault: true } },
    );
  typia.assert(address);
  // 3. Partially update the address - modify only some fields
  const updatedRecipientName = RandomGenerator.name();
  const updatedStreetAddress = RandomGenerator.paragraph({ sentences: 2 });
  const updatedCity = RandomGenerator.name(1);
  const updatedPostalCode = RandomGenerator.alphaNumeric(5);
  const updateBody = {
    recipientName: updatedRecipientName,
    streetAddress: updatedStreetAddress,
    city: updatedCity,
    postalCode: updatedPostalCode,
  } satisfies IEcommercePlatformShippingAddress.IUpdate;
  const updated =
    await api.functional.ecommercePlatform.customer.addresses.update(
      customerConnection,
      {
        addressId: address.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4. Validate updated fields match the new values
  TestValidator.equals(
    "recipient name updated",
    updated.recipient_name,
    updatedRecipientName,
  );
  TestValidator.equals(
    "street address updated",
    updated.street_address,
    updatedStreetAddress,
  );
  TestValidator.equals("city updated", updated.city, updatedCity);
  TestValidator.equals(
    "postal code updated",
    updated.postal_code,
    updatedPostalCode,
  );
  // 5. Validate non-updated fields remain unchanged
  TestValidator.equals(
    "phone number unchanged",
    updated.phone_number,
    address.phone_number,
  );
  TestValidator.equals("country unchanged", updated.country, address.country);
  TestValidator.equals("state unchanged", updated.state, address.state);
  // 6. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated at timestamp changed",
    updated.updated_at,
    address.updated_at,
  );
  // 7. Verify ownership is maintained
  TestValidator.equals("address id preserved", updated.id, address.id);
  TestValidator.equals(
    "customer profile maintained",
    updated.customerProfile.id,
    address.customerProfile.id,
  );
}
