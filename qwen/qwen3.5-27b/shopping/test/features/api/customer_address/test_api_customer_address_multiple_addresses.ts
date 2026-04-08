import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test that customers can maintain multiple shipping addresses for different recipients and locations.
 *
 * Validates the complete customer address management workflow by registering a new customer account and creating multiple shipping addresses with different recipient names, phone numbers, and locations. This test ensures that customers can store addresses for various purposes such as home delivery, work delivery, and gift shipping to different recipients.
 *
 * The test verifies that:
 * - Multiple addresses can be created for the same customer account
 * - Each address maintains its own unique recipient name and phone number
 * - Different locations (cities, states, postal codes) are supported
 * - All addresses are properly associated with the authenticated customer
 * - Each address receives a unique UUID identifier
 * - All addresses are created with is_default=false initially
 *
 * 1. Register a new customer account with email and password credentials.
 * 2. Create first address (home) with recipient "Alice Smith".
 * 3. Create second address (work) with recipient "Alice Smith - Office".
 * 4. Create third address (gift) with recipient "Bob Johnson".
 * 5. Validate all three addresses have unique IDs and correct data.
 * 6. Verify all addresses have is_default=false initially.
 */
export async function test_api_customer_address_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Create first address (home)
  const homeAddress =
    await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "Alice Smith",
          phone_number: "+1-555-111-2222",
          street_address: "456 Oak Avenue",
          city: "Los Angeles",
          state_province: "CA",
          postal_code: "90001",
          country: "United States",
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(homeAddress);
  // 3. Create second address (work)
  const workAddress =
    await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "Alice Smith - Office",
          phone_number: "+1-555-333-4444",
          street_address: "789 Business Park, Suite 100",
          city: "San Francisco",
          state_province: "CA",
          postal_code: "94102",
          country: "United States",
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(workAddress);
  // 4. Create third address (gift recipient)
  const giftAddress =
    await api.functional.shoppingMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "Bob Johnson",
          phone_number: "+1-555-555-6666",
          street_address: "321 Maple Drive",
          city: "Chicago",
          state_province: "IL",
          postal_code: "60601",
          country: "United States",
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(giftAddress);
  // 5. Validate all addresses have unique IDs
  TestValidator.notEquals(
    "home and work addresses have different IDs",
    homeAddress.id,
    workAddress.id,
  );
  TestValidator.notEquals(
    "home and gift addresses have different IDs",
    homeAddress.id,
    giftAddress.id,
  );
  TestValidator.notEquals(
    "work and gift addresses have different IDs",
    workAddress.id,
    giftAddress.id,
  );
  // 6. Validate recipient names are preserved correctly
  TestValidator.equals(
    "home address recipient name",
    homeAddress.recipient_name,
    "Alice Smith",
  );
  TestValidator.equals(
    "work address recipient name",
    workAddress.recipient_name,
    "Alice Smith - Office",
  );
  TestValidator.equals(
    "gift address recipient name",
    giftAddress.recipient_name,
    "Bob Johnson",
  );
  // 7. Validate phone numbers are preserved correctly
  TestValidator.equals(
    "home address phone number",
    homeAddress.phone_number,
    "+1-555-111-2222",
  );
  TestValidator.equals(
    "work address phone number",
    workAddress.phone_number,
    "+1-555-333-4444",
  );
  TestValidator.equals(
    "gift address phone number",
    giftAddress.phone_number,
    "+1-555-555-6666",
  );
  // 8. Validate all addresses have is_default=false initially
  TestValidator.equals(
    "home address is_default",
    homeAddress.is_default,
    false,
  );
  TestValidator.equals(
    "work address is_default",
    workAddress.is_default,
    false,
  );
  TestValidator.equals(
    "gift address is_default",
    giftAddress.is_default,
    false,
  );
  // 9. Validate addresses are active (deleted_at is null)
  TestValidator.equals("home address is active", homeAddress.deleted_at, null);
  TestValidator.equals("work address is active", workAddress.deleted_at, null);
  TestValidator.equals("gift address is active", giftAddress.deleted_at, null);
}
