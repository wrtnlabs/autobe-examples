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
 * Test shipping address creation with complete delivery details.
 *
 * Authenticates a new customer and creates a shipping address containing all delivery information including recipient name, contact phone number, street address, city, state, postal code, country, and default status. Verifies that the system correctly creates the address record, generates unique identifiers, links it to the customer's profile, and returns fully populated address details with system-generated timestamps.
 *
 * The address is automatically associated with the authenticated customer's profile without requiring explicit customer identification. Setting isDefault to true designates this address as the primary destination for checkout.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Create a shipping address with complete delivery details.
 * 3. Validate that all address fields are correctly stored and returned.
 * 4. Verify the customer profile linkage and system-generated fields.
 */
export async function test_api_address_creation_with_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // 2. Create shipping address with complete details
  const city = RandomGenerator.name(1);
  const state = RandomGenerator.name(1);
  const country = RandomGenerator.name(1);
  const body = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city,
    state,
    postalCode: RandomGenerator.alphaNumeric(6),
    country,
    isDefault: true,
  } satisfies IEcommercePlatformShippingAddress.ICreate;
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body },
    );
  typia.assert(address);
  // 3. Validate address fields match input
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    body.recipientName,
  );
  TestValidator.equals(
    "phone number matches",
    address.phone_number,
    body.phoneNumber,
  );
  TestValidator.equals(
    "street address matches",
    address.street_address,
    body.streetAddress,
  );
  TestValidator.equals("city matches", address.city, city);
  TestValidator.equals("state matches", address.state, state);
  TestValidator.equals(
    "postal code matches",
    address.postal_code,
    body.postalCode,
  );
  TestValidator.equals("country matches", address.country, country);
  // 4. Verify default status and customer profile linkage
  TestValidator.equals("is default is true", address.is_default, true);
  TestValidator.equals(
    "customer email matches",
    address.customerProfile.customer.email,
    authorized.email,
  );
  TestValidator.predicate("has valid id", address.id.length > 0);
  TestValidator.predicate("created_at exists", address.created_at.length > 0);
  TestValidator.predicate("updated_at exists", address.updated_at.length > 0);
}
