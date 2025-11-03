import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";

/**
 * Validates that a customer can retrieve their own specific address by id,
 * ensuring business rule enforcement.
 *
 * Workflow:
 *
 * 1. Register a new customer and obtain authentication context
 * 2. Create a new customer address (delivery address) for the registered customer
 * 3. Retrieve that address by id, as the same authenticated customer, and verify
 *    field correctness
 * 4. Attempt to retrieve the same address as a different customer and confirm
 *    proper access control (forbidden)
 * 5. Attempt to retrieve a non-existent address and confirm business error is
 *    thrown
 */
export async function test_api_customer_retrieve_own_address_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test.origin/join", // arbitrary URI for registration context
    referrer: "https://test.referrer/welcome",
    ip: RandomGenerator.pick([
      null,
      typia.random<string & tags.Format<"ipv4">>(),
      typia.random<string & tags.Format<"ipv6">>(),
    ]),
  } satisfies IShoppingCustomer.ICreate;

  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);
  TestValidator.equals(
    "registered email matches",
    customer.email,
    customerEmail,
  );

  // 2. Customer creates a new address
  const addressCreateBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.pick([
      RandomGenerator.paragraph({ sentences: 1 }),
      null,
      undefined,
    ]),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
    state: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
    postal_code: RandomGenerator.alphaNumeric(7),
    country: RandomGenerator.pick([
      "South Korea",
      "United States",
      "Japan",
      "Canada",
    ]),
    is_primary: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
  } satisfies IShoppingCustomerAddress.ICreate;

  const address: IShoppingCustomerAddress =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      { customerId: customer.id, body: addressCreateBody },
    );
  typia.assert(address);
  TestValidator.equals(
    "saved address customer id matches",
    address.shopping_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "address line1",
    address.address_line1,
    addressCreateBody.address_line1,
  );
  TestValidator.equals(
    "is_primary",
    address.is_primary,
    addressCreateBody.is_primary,
  );
  TestValidator.equals(
    "recipient name",
    address.recipient_name,
    addressCreateBody.recipient_name,
  );

  // 3. Retrieve the address by id as same customer
  const found: IShoppingCustomerAddress =
    await api.functional.shopping.customer.customers.addresses.at(connection, {
      customerId: customer.id,
      addressId: address.id,
    });
  typia.assert(found);
  TestValidator.equals("retrieved address id", found.id, address.id);
  TestValidator.equals(
    "retrieved address line1",
    found.address_line1,
    addressCreateBody.address_line1,
  );
  TestValidator.equals(
    "retrieved recipient name",
    found.recipient_name,
    addressCreateBody.recipient_name,
  );
  TestValidator.equals(
    "retrieved country",
    found.country,
    addressCreateBody.country,
  );

  // 4. Register a second customer to attempt forbidden retrieval
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.origin/other-join",
      referrer: "https://test.referrer/other-welcome",
      ip: RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"ipv4">>(),
        typia.random<string & tags.Format<"ipv6">>(),
      ]),
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer2);

  await TestValidator.error(
    "forbidden: cannot retrieve another customer's address",
    async () => {
      await api.functional.shopping.customer.customers.addresses.at(
        connection,
        {
          customerId: customer2.id,
          addressId: address.id,
        },
      );
    },
  );

  // 5. Attempt to retrieve non-existent address
  const nonExistentAddressId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not found: cannot retrieve non-existent address",
    async () => {
      await api.functional.shopping.customer.customers.addresses.at(
        connection,
        {
          customerId: customer.id,
          addressId: nonExistentAddressId,
        },
      );
    },
  );
}
