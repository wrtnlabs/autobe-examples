import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingWishlistItem";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";

/**
 * Validate customer wishlist item pagination and filtering.
 *
 * 1. Register a customer
 * 2. Create a wishlist for the customer (by attempting to add first item)
 * 3. Add multiple SKUs/items to the wishlist with different sku_codes and product
 *    names
 * 4. Retrieve all wishlist items paginated (test page/limit logic is correct)
 * 5. Filter the wishlist by a particular product name or SKU code using search,
 *    verify results
 * 6. Attempt to retrieve a wishlist as a different (unauthorized) customer,
 *    expecting authorization failure (error)
 */
export async function test_api_customer_wishlist_items_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register primary customer
  const customerData = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingCustomer.ICreate;
  const customer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // 2. Create wishlist by adding the first SKU (simulate multiple unique skus for test)
  const skuCodes = ArrayUtil.repeat(
    8,
    (i) => `SKU-AUTO-${RandomGenerator.alphaNumeric(5)}-${i}`,
  );
  const createdItems: IShoppingWishlistItem[] = [];
  for (const sku_code of skuCodes) {
    const item = await api.functional.shopping.customer.wishlists.items.create(
      connection,
      {
        wishlistId: customer.id as string & tags.Format<"uuid">,
        body: { sku_code } satisfies IShoppingWishlistItem.ICreate,
      },
    );
    typia.assert(item);
    createdItems.push(item);
  }

  // 3. Paginate: Retrieve items, page 1/limit 3
  let pageResult = await api.functional.shopping.customer.wishlists.items.index(
    connection,
    {
      wishlistId: customer.id as string & tags.Format<"uuid">,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 3 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(pageResult);
  TestValidator.equals(
    "pagination count matches limit or dataset size",
    pageResult.data.length,
    Math.min(3, createdItems.length),
  );
  TestValidator.equals(
    "pagination total records matches",
    pageResult.pagination.records,
    createdItems.length,
  );
  TestValidator.equals("current page is 1", pageResult.pagination.current, 1);
  TestValidator.equals("limit matches request", pageResult.pagination.limit, 3);

  // 4. Pagination: Retrieve page 2
  pageResult = await api.functional.shopping.customer.wishlists.items.index(
    connection,
    {
      wishlistId: customer.id as string & tags.Format<"uuid">,
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 3 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(pageResult);
  TestValidator.equals("current page is 2", pageResult.pagination.current, 2);

  // 5. Filtering: Search by SKU code substring
  const searchSku = skuCodes[0].substring(0, 8);
  const filteredPage =
    await api.functional.shopping.customer.wishlists.items.index(connection, {
      wishlistId: customer.id as string & tags.Format<"uuid">,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: createdItems.length as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        search: searchSku,
      },
    });
  typia.assert(filteredPage);
  TestValidator.predicate(
    "all filtered wishlist items include search substring in SKU",
    filteredPage.data.every((item) => item.sku.sku_code.includes(searchSku)),
  );

  // 6. Negative test: register a different customer and try to query the wishlist, which should fail auth
  const otherCustomerData = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingCustomer.ICreate;
  const otherCustomer: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerData,
    });
  typia.assert(otherCustomer);

  await TestValidator.error(
    "unauthorized customer cannot access another's wishlist items",
    async () => {
      await api.functional.shopping.customer.wishlists.items.index(connection, {
        wishlistId: customer.id as string & tags.Format<"uuid">,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 3 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      });
    },
  );
}
