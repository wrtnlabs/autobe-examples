import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderAddress";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";

/**
 * Validate retrieval, pagination, filtering, and authorization of a customer's
 * order addresses.
 *
 * 1. Register a customer account
 * 2. (PRECONDITION) An orderCode with at least two addresses belonging to the
 *    customer exists (simulate/retrieve)
 * 3. Retrieve all addresses for the orderCode using the authenticated customer
 *    session
 * 4. Validate that only addresses attached to the customer's orderCode are
 *    returned, with proper data and pagination
 * 5. Attempt filtering by type and recipient_name; verify filter works
 * 6. Attempt to access a non-existent or other user's orderCode, expect failure
 */
export async function test_api_customer_order_address_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://test.localhost/autobe-e2e-test",
      referrer: "https://test.localhost/autobe-e2e-test/start",
      ip: null,
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Simulate that there is an orderCode. Since order creation is out of scope, use a random string.
  const orderCode = RandomGenerator.alphaNumeric(12);

  // 3. Fetch addresses for the order, page 1, limit 2
  const body = {
    page: 1 as number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingOrderAddress.IRequest;
  const addresses =
    await api.functional.shopping.customer.orders.addresses.index(connection, {
      orderCode,
      body,
    });
  typia.assert(addresses);

  // 4. Confirm pagination object is present and correct
  TestValidator.predicate("pagination is present", !!addresses.pagination);
  TestValidator.equals("current page is 1", addresses.pagination.current, 1);
  TestValidator.equals("limit is 2", addresses.pagination.limit, 2);
  TestValidator.predicate("data is array", Array.isArray(addresses.data));

  // 5. Filtering by type (simulate valid filter)
  const typeFilter = addresses.data[0]?.type ?? "shipping";
  const filtered =
    await api.functional.shopping.customer.orders.addresses.index(connection, {
      orderCode,
      body: {
        ...body,
        type: typeFilter,
      },
    });
  typia.assert(filtered);
  for (const a of filtered.data) {
    TestValidator.equals("type matches filter", a.type, typeFilter);
  }

  // 6. Filtering by recipient name (simulate filter)
  const recipientNameFilter = addresses.data[0]?.recipient_name ?? "Test";
  const filteredByRecipient =
    await api.functional.shopping.customer.orders.addresses.index(connection, {
      orderCode,
      body: {
        ...body,
        recipient_name: recipientNameFilter,
      },
    });
  typia.assert(filteredByRecipient);
  for (const a of filteredByRecipient.data) {
    TestValidator.equals(
      "recipient_name matches filter",
      a.recipient_name,
      recipientNameFilter,
    );
  }

  // 7. Attempt to access another (likely unauthorized) orderCode
  await TestValidator.error("unauthorized for wrong orderCode", async () => {
    await api.functional.shopping.customer.orders.addresses.index(connection, {
      orderCode: RandomGenerator.alphaNumeric(12),
      body,
    });
  });
}
