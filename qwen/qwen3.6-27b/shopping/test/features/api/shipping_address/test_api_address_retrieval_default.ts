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
 * Test retrieving a shipping address that was explicitly set as the customer's default address.
 *
 * Validates the complete address retrieval flow by registering a new customer account, creating a shipping address with the default flag enabled, and retrieving the address by its unique identifier.
 *
 * Verifies that the response contains all geographic and contact details correctly populated, with `is_default` confirmed as true. Confirms the `customerProfile` relation properly links back to the authenticated customer and that timestamps are correctly generated upon address creation.
 *
 * 1. Register a new customer account to establish authentication context.
 * 2. Create a shipping address with `isDefault` set to true.
 * 3. Retrieve the address using its unique identifier.
 * 4. Validate that all address fields match and `is_default` is true.
 * 5. Confirm the `customerProfile` relation matches the registered customer's profile.
 */
export async function test_api_address_retrieval_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(customerConnection, {});
  typia.assert(joinedCustomer);
  const customer_profile = joinedCustomer.customer_profile!;
  typia.assert(customer_profile);
  // 2. Create a shipping address with isDefault = true
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        } satisfies DeepPartial<IEcommercePlatformShippingAddress.ICreate>,
      },
    );
  typia.assert(address);
  TestValidator.equals("is_default is true", address.is_default, true);
  TestValidator.equals(
    "customer profile id matches",
    address.customerProfile.id,
    customer_profile.id,
  );
  // 3. Retrieve the address by ID
  const retrievedAddress =
    await api.functional.ecommercePlatform.customer.addresses.at(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate retrieved address matches creation data
  TestValidator.equals("address id matches", retrievedAddress.id, address.id);
  TestValidator.equals(
    "is_default remains true",
    retrievedAddress.is_default,
    true,
  );
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    retrievedAddress.phone_number,
    address.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    retrievedAddress.street_address,
    address.street_address,
  );
  TestValidator.equals("city matches", retrievedAddress.city, address.city);
  TestValidator.equals("state matches", retrievedAddress.state, address.state);
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postal_code,
    address.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    address.country,
  );
  // 5. Validate customerProfile relation links to the correct customer
  TestValidator.equals(
    "customer profile id matches in retrieval",
    retrievedAddress.customerProfile.id,
    customer_profile.id,
  );
  TestValidator.equals(
    "customer profile display name matches",
    retrievedAddress.customerProfile.display_name,
    customer_profile.display_name,
  );
  // 6. Validate timestamps and deleted_at
  TestValidator.predicate(
    "created_at is not empty",
    retrievedAddress.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is not empty",
    retrievedAddress.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active address",
    retrievedAddress.deleted_at === null,
  );
}