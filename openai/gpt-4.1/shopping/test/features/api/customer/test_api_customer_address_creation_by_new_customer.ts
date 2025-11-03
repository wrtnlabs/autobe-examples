import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";

/**
 * Validates creation of a primary address by a newly registered customer.
 *
 * This workflow covers customer sign-up (with all required fields) and then
 * creation of that customer's first shipping address. All business rules and
 * field requirements for both entities are validated. The test ensures that
 * address creation only succeeds for the authenticated customer, the address is
 * marked as primary, and all fields match those submitted.
 */
export async function test_api_customer_address_creation_by_new_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://autobe-test-case.com/signup",
    referrer: "https://autobe-test-case.com/landing",
    // Optionally, IP (optional)
    ip: null,
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: registrationBody,
    });
  typia.assert(customer);

  // 2. Prepare the address creation request body
  const addressCreateBody = {
    address_line1: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 16,
    }),
    address_line2: null,
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 12 }),
    state: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 14 }),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: "South Korea",
    is_primary: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
  } satisfies IShoppingCustomerAddress.ICreate;

  // 3. Create the address for the just-created customer (authenticated)
  const address: IShoppingCustomerAddress =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addressCreateBody },
    );
  typia.assert(address);

  // 4. Validate output
  TestValidator.equals(
    "created address belongs to customer",
    address.shopping_customer_id,
    customer.id,
  );
  TestValidator.equals("created address is primary", address.is_primary, true);
  TestValidator.equals(
    "address_line1 matches",
    address.address_line1,
    addressCreateBody.address_line1,
  );
  TestValidator.equals(
    "address_line2 matches",
    address.address_line2,
    addressCreateBody.address_line2,
  );
  TestValidator.equals("city matches", address.city, addressCreateBody.city);
  TestValidator.equals("state matches", address.state, addressCreateBody.state);
  TestValidator.equals(
    "postal_code matches",
    address.postal_code,
    addressCreateBody.postal_code,
  );
  TestValidator.equals(
    "country matches",
    address.country,
    addressCreateBody.country,
  );
  TestValidator.equals("phone matches", address.phone, addressCreateBody.phone);
  TestValidator.equals(
    "recipient_name matches",
    address.recipient_name,
    addressCreateBody.recipient_name,
  );
}
