import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

/**
 * Test retrieving paginated wishlist items for an authenticated customer.
 *
 * 1. Authenticate as a customer using authorize_customer_join
 * 2. Add 3 products to wishlist using generate_random_ecommerce_mall_customer_wishlist_create
 * 3. Call PATCH /ecommerceMall/customer/wishlist with pagination params (page: 1, limit: 10)
 * 4. Verify pagination metadata and data structure
 * 5. Verify items are sorted by created_at DESC (newest first)
 * 6. Verify cross-customer isolation (only authenticated customer's items returned)
 */
export async function test_api_customer_wishlist_retrieve_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Add 3 products to wishlist to establish test data
  const item1 = await generate_random_ecommerce_mall_customer_wishlist_create(
    customerConnection,
    {},
  );
  typia.assert(item1);
  const item2 = await generate_random_ecommerce_mall_customer_wishlist_create(
    customerConnection,
    {},
  );
  typia.assert(item2);
  const item3 = await generate_random_ecommerce_mall_customer_wishlist_create(
    customerConnection,
    {},
  );
  typia.assert(item3);
  // Retrieve paginated wishlist items
  const response = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallWishlistItem.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  TestValidator.equals("total records is 3", response.pagination.records, 3);
  TestValidator.equals("total pages is 1", response.pagination.pages, 1);
  // Verify data array length
  TestValidator.equals("data contains 3 items", response.data.length, 3);
  // Verify sorting by created_at DESC (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentDate = new Date(response.data[i].createdAt).getTime();
    const nextDate = new Date(response.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `item ${i} created_at >= item ${i + 1} created_at (DESC sorting)`,
      currentDate >= nextDate,
    );
  }
  // Verify each wishlist item has required fields
  for (const item of response.data) {
    typia.assert<IEcommerceMallWishlistItem.ISummary>(item);
  }
  // Verify all created items are present in the response
  const itemIds = response.data.map((item) => item.id);
  TestValidator.predicate(
    "response contains item1",
    itemIds.includes(item1.id),
  );
  TestValidator.predicate(
    "response contains item2",
    itemIds.includes(item2.id),
  );
  TestValidator.predicate(
    "response contains item3",
    itemIds.includes(item3.id),
  );
}
