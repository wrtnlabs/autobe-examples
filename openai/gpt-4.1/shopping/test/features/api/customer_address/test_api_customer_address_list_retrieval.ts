import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomerAddress";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";

/**
 * Validates a customer's ability to retrieve the full list of their delivery
 * addresses.
 *
 * 1. Register a new customer through the join API and retrieve the authenticated
 *    context.
 * 2. Create a new address for the authenticated customer with all required address
 *    fields.
 * 3. Retrieve all addresses for the customer using the appropriate index endpoint
 *    and request structure.
 * 4. Verify that all returned addresses belong to the authenticated customer and
 *    that the newly added address appears in the list.
 * 5. Confirm that the paginated result matches expectations, and that data
 *    structure and ownership are strictly enforced.
 * 6. Ensure that requesting another customer's addresses is not permitted for this
 *    account.
 */
export async function test_api_customer_address_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new customer and retrieve auth context
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customer);
  const customerId = customer.id;

  // 2. Add a delivery address for this customer
  const addressBody = {
    address_line1: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 15,
    }),
    address_line2: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
    city: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    state: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 15 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.pick([
      "South Korea",
      "United States",
      "Japan",
      "France",
      "United Kingdom",
    ] as const),
    is_primary: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(),
  } satisfies IShoppingCustomerAddress.ICreate;
  const createdAddress =
    await api.functional.shopping.customer.customers.addresses.create(
      connection,
      { customerId, body: addressBody },
    );
  typia.assert(createdAddress);

  // 3. Retrieve all addresses for the customer, basic unfiltered list
  const listResponse =
    await api.functional.shopping.customer.customers.addresses.index(
      connection,
      {
        customerId,
        body: {},
      },
    );
  typia.assert(listResponse);

  // 4. Validate all returned addresses belong to this customer and contain the created address
  TestValidator.predicate(
    "every address belongs to the authenticated customer",
    listResponse.data.every(
      (address) => address.shopping_customer_id === customerId,
    ),
  );

  // Confirm that the created address appears in the returned list
  const found = listResponse.data.find((addr) => addr.id === createdAddress.id);
  TestValidator.predicate("created address appears in address list", !!found);
  if (found) {
    // All the basic address data matches source
    TestValidator.equals(
      "address_line1 matches",
      found.address_line1,
      addressBody.address_line1,
    );
    TestValidator.equals(
      "recipient_name matches",
      found.recipient_name,
      addressBody.recipient_name,
    );
    TestValidator.equals("country matches", found.country, addressBody.country);
    TestValidator.equals(
      "is_primary matches",
      found.is_primary,
      addressBody.is_primary,
    );
  }

  // 5. Check basic pagination result (should be at least 1 record and on the first page)
  TestValidator.predicate(
    "has at least one address in the list",
    listResponse.data.length >= 1,
  );
  TestValidator.equals(
    "pagination current page is 0 or 1 (system may be zero- or one-indexed)",
    [0, 1].includes(listResponse.pagination.current),
    true,
  );

  // 6. Attempt unauthorized access: try retrieving addresses for a random customer UUID (should fail)
  await TestValidator.error(
    "cannot access another customer's address list",
    async () => {
      await api.functional.shopping.customer.customers.addresses.index(
        connection,
        {
          customerId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );
}
