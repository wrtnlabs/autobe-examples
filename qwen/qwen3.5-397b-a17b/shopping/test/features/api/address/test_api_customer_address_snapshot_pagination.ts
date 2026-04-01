import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddressSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test pagination functionality for address snapshot history.
 *
 * This test verifies:
 * 1. Customer creates an address and performs 15+ updates to generate snapshots
 * 2. Pagination metadata is correct (current page, limit, total records, total pages)
 * 3. Snapshots are ordered by createdAt descending
 * 4. First page, middle page, and last page retrieval works correctly
 * 5. Sum of records across all pages equals total snapshot count
 * 6. Requesting page beyond available pages returns empty data array
 */
export async function test_api_customer_address_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create initial address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: RandomGenerator.name(),
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Perform 15+ updates to generate multiple snapshots
  const updateCount = 15;
  const updateData: IShoppingMallAddress.IUpdate[] = ArrayUtil.repeat(
    updateCount,
    (index) => ({
      recipientName: `${RandomGenerator.name()} ${index}`,
      recipientPhone: RandomGenerator.mobile(),
      streetAddress: `${RandomGenerator.paragraph({ sentences: 1 })} ${index}`,
      city: `${RandomGenerator.name()} ${index}`,
      state: `${RandomGenerator.name()} ${index}`,
      postalCode: `${typia.random<string>()}${index}`,
      country: `${RandomGenerator.name()} ${index}`,
    }),
  );
  for (const update of updateData) {
    const updated = await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: address.id,
        body: update satisfies IShoppingMallAddress.IUpdate,
      },
    );
    typia.assert(updated);
  }
  // 4. Test pagination - expect 16 snapshots (1 initial + 15 updates)
  const expectedTotalSnapshots = updateCount + 1;
  const limit = 5;
  const expectedPages = Math.ceil(expectedTotalSnapshots / limit);
  // 5. Fetch first page
  const page1 =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerConnection,
      {
        addressId: address.id,
        body: {
          page: 1,
          limit: limit,
          sort: ["created_at DESC"],
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, limit);
  TestValidator.equals(
    "page 1 total records",
    page1.pagination.records,
    expectedTotalSnapshots,
  );
  TestValidator.equals(
    "page 1 total pages",
    page1.pagination.pages,
    expectedPages,
  );
  TestValidator.equals("page 1 data length", page1.data.length, limit);
  // 6. Verify snapshots are ordered by createdAt descending on first page
  for (let i = 0; i < page1.data.length - 1; i++) {
    const current = page1.data[i];
    const next = page1.data[i + 1];
    TestValidator.predicate(
      `snapshot ${i} should be newer than snapshot ${i + 1}`,
      new Date(current.createdAt).getTime() >=
        new Date(next.createdAt).getTime(),
    );
  }
  // 7. Fetch middle page (page 2)
  const page2 =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerConnection,
      {
        addressId: address.id,
        body: {
          page: 2,
          limit: limit,
          sort: ["created_at DESC"],
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, limit);
  TestValidator.equals(
    "page 2 total records",
    page2.pagination.records,
    expectedTotalSnapshots,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2.pagination.pages,
    expectedPages,
  );
  TestValidator.equals("page 2 data length", page2.data.length, limit);
  // 8. Fetch last page (page 4)
  const lastPage =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerConnection,
      {
        addressId: address.id,
        body: {
          page: expectedPages,
          limit: limit,
          sort: ["created_at DESC"],
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(lastPage);
  const expectedLastPageLength =
    expectedTotalSnapshots % limit === 0
      ? limit
      : expectedTotalSnapshots % limit;
  TestValidator.equals(
    "last page current page",
    lastPage.pagination.current,
    expectedPages,
  );
  TestValidator.equals(
    "last page data length",
    lastPage.data.length,
    expectedLastPageLength,
  );
  // 9. Verify continuity across pages (last item of page 1 should be newer than first item of page 2)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Last = page1.data[page1.data.length - 1];
    const page2First = page2.data[0];
    TestValidator.predicate(
      "page 1 last snapshot should be newer than page 2 first snapshot",
      new Date(page1Last.createdAt).getTime() >=
        new Date(page2First.createdAt).getTime(),
    );
  }
  // 10. Fetch all pages and verify total count
  const allSnapshots: IShoppingMallAddressSnapshot.ISummary[] = [];
  for (let pageNum = 1; pageNum <= expectedPages; pageNum++) {
    const page =
      await api.functional.shoppingMall.customer.addresses.snapshots.index(
        customerConnection,
        {
          addressId: address.id,
          body: {
            page: pageNum,
            limit: limit,
            sort: ["created_at DESC"],
          } satisfies IShoppingMallAddressSnapshot.IRequest,
        },
      );
    typia.assert(page);
    allSnapshots.push(...page.data);
  }
  TestValidator.equals(
    "total snapshots across all pages",
    allSnapshots.length,
    expectedTotalSnapshots,
  );
  // 11. Test page beyond available pages returns empty data
  const beyondPage =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerConnection,
      {
        addressId: address.id,
        body: {
          page: expectedPages + 10,
          limit: limit,
          sort: ["created_at DESC"],
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page data should be empty",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page total records",
    beyondPage.pagination.records,
    expectedTotalSnapshots,
  );
  // 12. Verify snapshot immutability - fetch same page twice and compare
  const page1Again =
    await api.functional.shoppingMall.customer.addresses.snapshots.index(
      customerConnection,
      {
        addressId: address.id,
        body: {
          page: 1,
          limit: limit,
          sort: ["created_at DESC"],
        } satisfies IShoppingMallAddressSnapshot.IRequest,
      },
    );
  typia.assert(page1Again);
  TestValidator.equals(
    "snapshot data should be immutable",
    page1.data.map((s) => s.id),
    page1Again.data.map((s) => s.id),
  );
}
