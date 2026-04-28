import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Admin retrieves a specific customer's active shipping address to review delivery information.
 *
 * Validates the complete admin read workflow for shipping address details. Tests that an authenticated admin can access detailed address information for any customer on the platform. The response is validated to ensure all address fields are present and correctly populated, including recipient details, geographic location, default designation, owning customer profile summary, and lifecycle timestamps.
 *
 * Special attention is given to verifying that the customerProfile relation correctly references the address owner and that the deleted_at field is null for active addresses.
 *
 * 1. Administrator joins the platform and authenticates.
 * 2. Customer joins the platform, establishing their profile.
 * 3. Customer creates a shipping address with randomized delivery details.
 * 4. Admin retrieves the address using customer profile ID and address ID.
 * 5. Validates response completeness and business logic correctness.
 */
export async function test_api_shipping_address_retrieve_address_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  // Extract customer profile ID
  const customerProfile = customerAuthorized.customer_profile;
  if (customerProfile === null || customerProfile === undefined) {
    throw new Error("Customer profile not found in authorization response");
  }
  const customerId = customerProfile.id;
  // 3. Customer creates a shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Admin retrieves the shipping address
  const retrievedAddress =
    await api.functional.ecommercePlatform.admin.customers.addresses.at(
      adminConnection,
      {
        customerId,
        addressId: address.id,
      },
    );
  typia.assert(retrievedAddress);
  // 5. Validate response completeness and business logic
  // Address ID matches
  TestValidator.equals("address ID matches", retrievedAddress.id, address.id);
  // Address ownership matches customer
  TestValidator.equals(
    "customer profile ID matches",
    retrievedAddress.customerProfile.id,
    customerId,
  );
  // Active address should have null deleted_at
  TestValidator.equals(
    "deleted_at is null for active address",
    retrievedAddress.deleted_at,
    null,
  );
  // Recipient name is present and non-empty
  TestValidator.predicate(
    "recipient name is non-empty",
    retrievedAddress.recipient_name.length > 0,
  );
  // Phone number is present and non-empty
  TestValidator.predicate(
    "phone number is non-empty",
    retrievedAddress.phone_number.length > 0,
  );
  // Street address is present and non-empty
  TestValidator.predicate(
    "street address is non-empty",
    retrievedAddress.street_address.length > 0,
  );
  // City is present and non-empty
  TestValidator.predicate(
    "city is non-empty",
    retrievedAddress.city.length > 0,
  );
  // State is present and non-empty
  TestValidator.predicate(
    "state is non-empty",
    retrievedAddress.state.length > 0,
  );
  // Postal code is present and non-empty
  TestValidator.predicate(
    "postal code is non-empty",
    retrievedAddress.postal_code.length > 0,
  );
  // Country is present and non-email
  TestValidator.predicate(
    "country is non-empty",
    retrievedAddress.country.length > 0,
  );
  // Customer profile summary includes email
  TestValidator.predicate(
    "customer profile email is non-empty",
    retrievedAddress.customerProfile.customer.email.length > 0,
  );
  // Customer profile display name is non-empty
  TestValidator.predicate(
    "customer profile display name is non-empty",
    retrievedAddress.customerProfile.display_name.length > 0,
  );
  // Lifecycle timestamps are present (string format)
  TestValidator.predicate(
    "created_at is non-empty",
    retrievedAddress.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty",
    retrievedAddress.updated_at.length > 0,
  );
}
