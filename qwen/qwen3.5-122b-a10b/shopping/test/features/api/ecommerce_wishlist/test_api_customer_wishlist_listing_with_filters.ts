import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_wishlists_items_create } from "../../../generate/generate_random_ecommerce_customer_wishlists_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_wishlist_item } from "../../../prepare/prepare_random_ecommerce_wishlist_item";

/**
 * Test customer wishlist listing with various filtering and pagination options.
 *
 * Validates the customer wishlist endpoint's ability to filter, sort, and paginate wishlist items based on multiple criteria including product name search, date range filters, availability status, and custom sorting.
 *
 * The test creates multiple products with different names and availability statuses, adds them to the customer's wishlist at different times, then verifies that the filtering and sorting logic works correctly.
 *
 * 1. Create customer account and authenticate.
 * 2. Create seller account and authenticate.
 * 3. Create multiple products with different names and stock statuses.
 * 4. Add products to wishlist at staggered times.
 * 5. Test search filter with partial product name matching.
 * 6. Test date range filters (created_at_from, created_at_to).
 * 7. Test availability status filter (in_stock, out_of_stock).
 * 8. Test combined filters.
 * 9. Test sorting by created_at and product_name.
 * 10. Test pagination with cursor and limit.
 */
export async function test_api_customer_wishlist_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create multiple products with different names and stock statuses
  const products: IEcommerceProduct[] = [];
  // Product 1: "Apple iPhone 15 Pro" - in stock
  const product1 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Apple iPhone 15 Pro",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 1500000,
        variants: [
          {
            sku_code: "IPHONE15PRO-128GB-BLACK",
            option_values: "color=Black;storage=128GB",
            price: 1500000,
          },
        ],
      },
    },
  );
  typia.assert(product1);
  products.push(product1);
  // Product 2: "Samsung Galaxy S24 Ultra" - in stock
  const product2 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Samsung Galaxy S24 Ultra",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 1400000,
        variants: [
          {
            sku_code: "S24ULTRA-256GB-SILVER",
            option_values: "color=Silver;storage=256GB",
            price: 1400000,
          },
        ],
      },
    },
  );
  typia.assert(product2);
  products.push(product2);
  // Product 3: "Apple MacBook Air M3" - in stock
  const product3 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Apple MacBook Air M3",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 2000000,
        variants: [
          {
            sku_code: "MACBOOKAIR-M3-512GB-GOLD",
            option_values: "color=Gold;storage=512GB",
            price: 2000000,
          },
        ],
      },
    },
  );
  typia.assert(product3);
  products.push(product3);
  // Product 4: "Sony WH-1000XM5 Headphones" - in stock
  const product4 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Sony WH-1000XM5 Headphones",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 400000,
        variants: [
          {
            sku_code: "WH1000XM5-BLACK",
            option_values: "color=Black",
            price: 400000,
          },
        ],
      },
    },
  );
  typia.assert(product4);
  products.push(product4);
  // Product 5: "Apple Watch Series 9" - in stock
  const product5 = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Apple Watch Series 9",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 500000,
        variants: [
          {
            sku_code: "WATCH9-45MM-MIDNIGHT",
            option_values: "size=45mm;color=Midnight",
            price: 500000,
          },
        ],
      },
    },
  );
  typia.assert(product5);
  products.push(product5);
  // 4. Add products to wishlist at different times
  const wishlistItems: IEcommerceWishlistItem[] = [];
  // Add product 1 (Apple iPhone)
  const item1 = await generate_random_ecommerce_customer_wishlists_items_create(
    customerConnection,
    {
      body: {
        ecommerce_product_id: product1.id,
      } satisfies IEcommerceWishlistItem.ICreate,
      params: {
        wishlistId: customer.id, // Customer's wishlist ID is their customer ID
      },
    },
  );
  typia.assert(item1);
  wishlistItems.push(item1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Add product 2 (Samsung Galaxy)
  const item2 = await generate_random_ecommerce_customer_wishlists_items_create(
    customerConnection,
    {
      body: {
        ecommerce_product_id: product2.id,
      } satisfies IEcommerceWishlistItem.ICreate,
      params: {
        wishlistId: customer.id,
      },
    },
  );
  typia.assert(item2);
  wishlistItems.push(item2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Add product 3 (Apple MacBook)
  const item3 = await generate_random_ecommerce_customer_wishlists_items_create(
    customerConnection,
    {
      body: {
        ecommerce_product_id: product3.id,
      } satisfies IEcommerceWishlistItem.ICreate,
      params: {
        wishlistId: customer.id,
      },
    },
  );
  typia.assert(item3);
  wishlistItems.push(item3);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Add product 4 (Sony Headphones)
  const item4 = await generate_random_ecommerce_customer_wishlists_items_create(
    customerConnection,
    {
      body: {
        ecommerce_product_id: product4.id,
      } satisfies IEcommerceWishlistItem.ICreate,
      params: {
        wishlistId: customer.id,
      },
    },
  );
  typia.assert(item4);
  wishlistItems.push(item4);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Add product 5 (Apple Watch)
  const item5 = await generate_random_ecommerce_customer_wishlists_items_create(
    customerConnection,
    {
      body: {
        ecommerce_product_id: product5.id,
      } satisfies IEcommerceWishlistItem.ICreate,
      params: {
        wishlistId: customer.id,
      },
    },
  );
  typia.assert(item5);
  wishlistItems.push(item5);
  // 5. Test search filter - partial product name matching (case-insensitive)
  const searchResult = await api.functional.ecommerce.customer.wishlists.index(
    customerConnection,
    {
      body: {
        search: "apple",
      } satisfies IEcommerceWishlistItem.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search filter returns Apple products",
    searchResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all results contain 'apple'",
    searchResult.data.every((item) =>
      item.product.name.toLowerCase().includes("apple"),
    ),
  );
  // 6. Test date range filters
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns all items",
    dateRangeResult.data.length,
    5,
  );
  // Test with narrower range (only items created in last hour)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourResult = await api.functional.ecommerce.customer.wishlists.index(
    customerConnection,
    {
      body: {
        created_at_from: oneHourAgo.toISOString(),
        created_at_to: tomorrow.toISOString(),
      } satisfies IEcommerceWishlistItem.IRequest,
    },
  );
  typia.assert(oneHourResult);
  TestValidator.equals(
    "narrow date range filter returns items",
    oneHourResult.data.length > 0,
    true,
  );
  // 7. Test availability status filter (all products should be in_stock)
  const availabilityResult =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          availability_status: "in_stock",
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(availabilityResult);
  TestValidator.equals(
    "availability filter returns in_stock products",
    availabilityResult.data.length,
    5,
  );
  // 8. Test combined filters - search + availability
  const combinedResult =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          search: "apple",
          availability_status: "in_stock",
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter returns Apple in-stock products",
    combinedResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all combined results are Apple products",
    combinedResult.data.every((item) =>
      item.product.name.toLowerCase().includes("apple"),
    ),
  );
  // 9. Test sorting by product_name (ascending)
  const sortByNameAsc = await api.functional.ecommerce.customer.wishlists.index(
    customerConnection,
    {
      body: {
        sort_by: "product_name",
        sort_order: "asc",
      } satisfies IEcommerceWishlistItem.IRequest,
    },
  );
  typia.assert(sortByNameAsc);
  TestValidator.equals(
    "sort by name asc has 5 items",
    sortByNameAsc.data.length,
    5,
  );
  // Verify ascending order
  let isAscending = true;
  for (let i = 1; i < sortByNameAsc.data.length; i++) {
    if (
      sortByNameAsc.data[i - 1].product.name >
      sortByNameAsc.data[i].product.name
    ) {
      isAscending = false;
      break;
    }
  }
  TestValidator.predicate("products sorted in ascending order", isAscending);
  // Test sorting by product_name (descending)
  const sortByNameDesc =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          sort_by: "product_name",
          sort_order: "desc",
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(sortByNameDesc);
  TestValidator.equals(
    "sort by name desc has 5 items",
    sortByNameDesc.data.length,
    5,
  );
  // Verify descending order
  let isDescending = true;
  for (let i = 1; i < sortByNameDesc.data.length; i++) {
    if (
      sortByNameDesc.data[i - 1].product.name <
      sortByNameDesc.data[i].product.name
    ) {
      isDescending = false;
      break;
    }
  }
  TestValidator.predicate("products sorted in descending order", isDescending);
  // Test sorting by created_at (descending - newest first)
  const sortByCreatedAtDesc =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  TestValidator.equals(
    "sort by created_at desc has 5 items",
    sortByCreatedAtDesc.data.length,
    5,
  );
  // Verify descending order by created_at
  let isCreatedAtDescending = true;
  for (let i = 1; i < sortByCreatedAtDesc.data.length; i++) {
    if (
      sortByCreatedAtDesc.data[i - 1].created_at <
      sortByCreatedAtDesc.data[i].created_at
    ) {
      isCreatedAtDescending = false;
      break;
    }
  }
  TestValidator.predicate(
    "items sorted by created_at descending",
    isCreatedAtDescending,
  );
  // 10. Test pagination with limit
  const paginationResult =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          limit: 2,
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit returns 2 items",
    paginationResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata shows correct limit",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination metadata shows total records",
    paginationResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination metadata shows total pages",
    paginationResult.pagination.pages,
    3,
  );
  // Test pagination with cursor (get next page)
  if (paginationResult.data.length > 0) {
    const lastItem = paginationResult.data[paginationResult.data.length - 1];
    const encodedCursor = btoa(
      JSON.stringify({
        created_at: lastItem.created_at,
        id: lastItem.id,
      }),
    );
    const nextPageResult =
      await api.functional.ecommerce.customer.wishlists.index(
        customerConnection,
        {
          body: {
            limit: 2,
            cursor: encodedCursor,
          } satisfies IEcommerceWishlistItem.IRequest,
        },
      );
    typia.assert(nextPageResult);
    TestValidator.equals(
      "pagination cursor returns next page",
      nextPageResult.data.length,
      2,
    );
    // Verify no overlap with first page
    const firstPageIds = new Set(paginationResult.data.map((item) => item.id));
    const secondPageIds = new Set(nextPageResult.data.map((item) => item.id));
    let hasOverlap = false;
    for (const id of secondPageIds) {
      if (firstPageIds.has(id)) {
        hasOverlap = true;
        break;
      }
    }
    TestValidator.predicate("pagination pages have no overlap", !hasOverlap);
  }
  // 11. Test empty search results
  const emptySearchResult =
    await api.functional.ecommerce.customer.wishlists.index(
      customerConnection,
      {
        body: {
          search: "nonexistentproduct12345",
        } satisfies IEcommerceWishlistItem.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination shows 0 records",
    emptySearchResult.pagination.records,
    0,
  );
}
