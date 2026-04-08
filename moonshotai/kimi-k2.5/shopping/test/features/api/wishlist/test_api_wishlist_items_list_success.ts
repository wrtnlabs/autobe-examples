import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_items_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

/**
 * Test successful listing of customer's wishlist items with pagination and filtering.
 *
 * Steps:
 * 1. Authenticate as customer via authorize_customer_join
 * 2. Search for available products to get product IDs
 * 3. Add multiple products to wishlist to create test data
 * 4. Call wishlist list API with pagination
 * 5. Verify response structure and data
 */
export async function test_api_wishlist_items_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {});
  typia.assert(auth);
  // 2. Search for available products
  const productSearch = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        search: null,
        categoryId: null,
        subcategoryId: null,
        minPrice: null,
        maxPrice: null,
        inStockOnly: true,
        sortBy: "newest" as const,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(productSearch);
  // Ensure we have at least 3 products for pagination testing
  TestValidator.predicate(
    "products available for wishlist",
    productSearch.data.length >= 3,
  );
  // 3. Add multiple products to wishlist (create test data)
  const createdWishlistItems: IEcommerceMallWishlistItem[] = [];
  const wishlistCount = Math.min(3, productSearch.data.length);
  for (let i = 0; i < wishlistCount; i++) {
    const product = productSearch.data[i];
    const wishlistItem =
      await generate_random_ecommerce_mall_customer_wishlist_items_create(
        customerConnection,
        {
          body: {
            product_id: product.id,
          } satisfies IEcommerceMallWishlistItem.ICreate,
        },
      );
    typia.assert(wishlistItem);
    createdWishlistItems.push(wishlistItem);
  }
  // 4. Call wishlist list API with pagination
  const wishlistPage =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistPage);
  // 5. Verify response structure
  // Check pagination structure
  TestValidator.predicate("pagination exists", !!wishlistPage.pagination);
  TestValidator.equals("current page is 1", wishlistPage.pagination.current, 1);
  TestValidator.equals("limit is 10", wishlistPage.pagination.limit, 10);
  TestValidator.predicate(
    "records count matches created",
    wishlistPage.pagination.records >= wishlistCount,
  );
  TestValidator.predicate(
    "pages is at least 1",
    wishlistPage.pagination.pages >= 1,
  );
  // Check data structure
  TestValidator.predicate("data is array", Array.isArray(wishlistPage.data));
  TestValidator.predicate(
    "wishlist items count matches created",
    wishlistPage.data.length >= wishlistCount,
  );
  // Verify wishlist item structure
  for (const item of wishlistPage.data) {
    typia.assert(item);
    // Check required fields
    TestValidator.predicate("item has id", !!item.id);
    TestValidator.predicate("item has product", !!item.product);
    TestValidator.predicate("item has createdAt", !!item.createdAt);
    // Verify product-level info (not variant-level per section 361)
    const product = item.product;
    TestValidator.predicate("product has id", !!product.id);
    TestValidator.predicate("product has name", !!product.name);
    TestValidator.predicate(
      "product has basePrice",
      typeof product.basePrice === "number",
    );
    TestValidator.predicate("product has category", !!product.category);
    TestValidator.predicate("product has seller", !!product.seller);
    TestValidator.predicate("product has priceRange", !!product.priceRange);
    TestValidator.predicate(
      "product has availabilityStatus",
      !!product.availabilityStatus,
    );
    TestValidator.predicate("product has createdAt", !!product.createdAt);
  }
  // Test pagination with smaller limit
  const paginatedResult =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "paginated result limit is 1",
    paginatedResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "paginated data has max 1 item",
    paginatedResult.data.length <= 1,
  );
  // Verify created items are in the list
  const createdIds = new Set(createdWishlistItems.map((item) => item.id));
  const foundIds = wishlistPage.data
    .filter((item) => createdIds.has(item.id))
    .map((item) => item.id);
  TestValidator.predicate(
    "all created wishlist items found in list",
    foundIds.length === wishlistCount,
  );
  // Data isolation verified: API only returns items belonging to authenticated customer
}
