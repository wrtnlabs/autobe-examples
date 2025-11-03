import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";

/**
 * Validate soft-deletion of a customer's saved address by self-removal.
 *
 * 1. Register a customer and retrieve authorization context.
 * 2. Register a new address for this customer.
 * 3. Remove the address using the soft-delete (erase) endpoint.
 * 4. Verify the address deleted_at field is populated in the response.
 * 5. Attempt to remove another customer's address and ensure forbidden.
 */
export async function test_api_customer_address_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register first customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerRegister = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://www.customer-registration.com/",
    referrer: "https://www.landing.com/signup",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerRegister,
    });
  typia.assert(customer);

  // 2. Register address for this customer
  const addressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.paragraph({ sentences: 1 }),
    state: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(),
  } satisfies IShoppingCustomerAddress.ICreate;
  const address =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressBody,
      },
    );
  typia.assert(address);
  TestValidator.equals(
    "address assigned to correct customer after create",
    address.shopping_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "address not soft-deleted upon creation",
    address.deleted_at,
    null,
  );

  // 3. Remove the address (soft-delete)
  const erased =
    await api.functional.shopping.customer.customers.addresses.erase(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
      },
    );
  typia.assert(erased);
  TestValidator.equals(
    "deleted_at must be populated on erase",
    typeof erased.deleted_at,
    "string",
  );
  TestValidator.notEquals(
    "address info still retrievable by id after soft deletion",
    erased.deleted_at,
    null,
  );
  TestValidator.equals(
    "customer id remains as original",
    erased.shopping_customer_id,
    customer.id,
  );

  // 4. Register a second customer (for prohibited removal test)
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomerRegister = {
    email: otherCustomerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://www.customer-registration.com/",
    referrer: "https://www.landing.com/signup",
  } satisfies IShoppingCustomer.ICreate;
  const otherCustomer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerRegister,
    });
  typia.assert(otherCustomer);

  // 5. Register address for the second customer
  const otherAddressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.paragraph({ sentences: 1 }),
    state: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_primary: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(),
  } satisfies IShoppingCustomerAddress.ICreate;
  const otherAddress =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      {
        customerId: otherCustomer.id,
        body: otherAddressBody,
      },
    );
  typia.assert(otherAddress);
  TestValidator.equals(
    "address assigned to correct customer after create",
    otherAddress.shopping_customer_id,
    otherCustomer.id,
  );

  // 6. Attempt to erase other's address using first customer's context
  await TestValidator.error(
    "forbidden: cannot erase another customer's address",
    async () => {
      await api.functional.shopping.customer.customers.addresses.erase(
        connection,
        {
          customerId: customer.id,
          addressId: otherAddress.id,
        },
      );
    },
  );
}
