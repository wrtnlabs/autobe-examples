import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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

export async function test_api_customer_addresses_list_with_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer and get an authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create 3 addresses
  // Address 1 - non-default (oldest)
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(address1);
  // Address 2 - non-default
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(address2);
  // Address 3 - default (newest)
  const address3 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        },
      },
    );
  typia.assert(address3);
  const createdIds = [address1.id, address2.id, address3.id];
  // Step 3: Test 1 - Default listing (no filters, latest first)
  const defaultList =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultList);
  // Pagination validations
  TestValidator.predicate("records >= 3", defaultList.pagination.records >= 3);
  TestValidator.equals("current page is 1", defaultList.pagination.current, 1);
  TestValidator.equals("default limit is 20", defaultList.pagination.limit, 20);
  TestValidator.predicate("data length >= 3", defaultList.data.length >= 3);
  // Validate all created address IDs are present
  for (const id of createdIds) {
    TestValidator.predicate(
      `address ${id} is present`,
      defaultList.data.some((addr) => addr.id === id),
    );
  }
  // Exactly one address with isDefault = true
  const defaultAddresses = defaultList.data.filter((addr) => addr.isDefault);
  TestValidator.equals(
    "exactly one default address",
    defaultAddresses.length,
    1,
  );
  TestValidator.equals(
    "default address matches address3",
    defaultAddresses[0]!.id,
    address3.id,
  );
  // Default ordering: latest first (createdAt DESC)
  for (let i = 0; i < defaultList.data.length - 1; i++) {
    const curr = defaultList.data[i]!;
    const next = defaultList.data[i + 1]!;
    TestValidator.predicate(
      `item ${i} createdAt >= item ${i + 1} createdAt (latest first)`,
      new Date(curr.createdAt) >= new Date(next.createdAt),
    );
  }
  // Step 4: Test 2 - Sort by oldest
  const oldestList = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: { sort: "oldest" } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(oldestList);
  // Validate ascending order (oldest first)
  for (let i = 0; i < oldestList.data.length - 1; i++) {
    const curr = oldestList.data[i]!;
    const next = oldestList.data[i + 1]!;
    TestValidator.predicate(
      `item ${i} createdAt <= item ${i + 1} createdAt (oldest first)`,
      new Date(curr.createdAt) <= new Date(next.createdAt),
    );
  }
  // Step 5: Test 3 - Sort by default_first
  const defaultFirstList =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          sort: "default_first",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(defaultFirstList);
  TestValidator.predicate(
    "first element is default address",
    defaultFirstList.data[0]!.isDefault === true,
  );
  // Step 6: Test 4 - Pagination with limit 2
  const pagedList = await api.functional.shoppingMall.customer.addresses.index(
    customerConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(pagedList);
  TestValidator.equals("paged data has 2 items", pagedList.data.length, 2);
  TestValidator.predicate("records >= 3", pagedList.pagination.records >= 3);
  TestValidator.equals("limit is 2", pagedList.pagination.limit, 2);
  TestValidator.equals(
    "pages is ceil(records/2)",
    pagedList.pagination.pages,
    Math.ceil(pagedList.pagination.records / 2),
  );
}
