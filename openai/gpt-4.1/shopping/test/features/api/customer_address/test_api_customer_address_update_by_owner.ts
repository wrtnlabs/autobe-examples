import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";

/**
 * Validate that a customer can update their own delivery address, including
 * audit update and permission boundaries.
 *
 * 1. Register a new customer and obtain their authentication.
 * 2. Create an address for this customer.
 * 3. Update the address as this customer, modifying multiple fields.
 * 4. Confirm the modification is reflected and audit timestamps are updated.
 * 5. Attempt to update as a fake or unauthorized customer and validate error.
 */
export async function test_api_customer_address_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shoppingmall.example.com/register",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: registerBody,
    });
  typia.assert(customer);
  const customerId = customer.id;

  // 2. Create an address for this customer
  const addressCreateBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.paragraph({ sentences: 1 }),
    state: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(),
  } satisfies IShoppingCustomerAddress.ICreate;
  const createdAddress: IShoppingCustomerAddress =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(createdAddress);
  TestValidator.predicate(
    "address belongs to customer",
    createdAddress.shopping_customer_id === customerId,
  );

  // 3. Update the address as this customer
  const updateBody = {
    address_line1: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    address_line2: null,
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
    state: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
    postal_code: RandomGenerator.alphaNumeric(7),
    country: "South Korea",
    is_primary: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(),
  } satisfies IShoppingCustomerAddress.IUpdate;
  const updated: IShoppingCustomerAddress =
    await api.functional.shopping.customer.customers.addresses.update(
      connection,
      {
        customerId,
        addressId: createdAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("address_id matches", updated.id, createdAddress.id);
  TestValidator.equals("all updated fields reflected", updated, {
    ...updated,
    ...updateBody,
  });
  TestValidator.predicate(
    "updated_at changes after update",
    new Date(updated.updated_at).getTime() >
      new Date(createdAddress.updated_at).getTime(),
  );

  // 4. Attempt to update as another (unauthorized) customer
  const secondCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shoppingmall.example.com/register2",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const otherCustomer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: secondCustomerBody,
    });
  typia.assert(otherCustomer);

  await api.functional.auth.customer.join(connection, {
    body: registerBody,
  }); // switch context back to customer 1 (original account)

  await TestValidator.error(
    "different customer cannot update address",
    async () => {
      await api.functional.shopping.customer.customers.addresses.update(
        connection,
        {
          customerId: otherCustomer.id,
          addressId: createdAddress.id,
          body: {
            address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );

  // 5. Simulate invalid (unauthenticated) update
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update address",
    async () => {
      await api.functional.shopping.customer.customers.addresses.update(
        unauthConn,
        {
          customerId,
          addressId: createdAddress.id,
          body: {
            address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
}
