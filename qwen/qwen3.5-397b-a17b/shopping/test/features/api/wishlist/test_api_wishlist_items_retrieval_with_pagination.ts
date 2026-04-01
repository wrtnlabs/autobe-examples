import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
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
import { generate_random_shopping_mall_customer_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test customer wishlist items retrieval with pagination.
 *
 * This test validates the complete wishlist retrieval workflow:
 * 1. Customer and seller account setup
 * 2. Product creation by seller
 * 3. Adding products to customer wishlist
 * 4. Retrieving wishlist with pagination
 * 5. Validating pagination metadata and sort order
 */
export async function test_api_wishlist_items_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register customer account
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${customerAuth.token.access}` },
  };
  // 2. Seller setup - register seller account
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // 3. Create multiple products (5 products) for wishlist testing
  const products: IShoppingMallProduct[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      return await generate_random_shopping_mall_seller_products_create(
        sellerConnection,
        {},
      );
    },
  );
  // 4. Add all products to customer's wishlist
  const wishlistItems: IShoppingMallWishlistItem[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      return await generate_random_shopping_mall_customer_wishlist_items_create(
        customerConnection,
        {
          body: { product_id: products[index].id },
        },
      );
    });
  // 5. Retrieve wishlist items with default pagination (page=1, limit=20, sort=desc)
  const wishlistResponse: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistResponse);
  // 6. Validate response structure and data count
  TestValidator.equals(
    "wishlist items count matches added products",
    wishlistResponse.data.length,
    5,
  );
  TestValidator.equals(
    "pagination records count",
    wishlistResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    wishlistResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    wishlistResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination pages count",
    wishlistResponse.pagination.pages,
    1,
  );
  // 7. Validate each wishlist item structure
  for (const item of wishlistResponse.data) {
    // Validate item has required fields
    TestValidator.predicate(
      "wishlist item has valid id",
      item.id !== undefined && item.id.length > 0,
    );
    // Validate availability status is boolean
    TestValidator.predicate(
      "availability is boolean",
      typeof item.available === "boolean",
    );
    // Validate created_at timestamp exists
    TestValidator.predicate(
      "created_at timestamp exists",
      item.created_at !== undefined && item.created_at.length > 0,
    );
  }
  // 8. Verify sort order (desc = newest first)
  if (wishlistResponse.data.length >= 2) {
    const firstItem = wishlistResponse.data[0];
    const secondItem = wishlistResponse.data[1];
    TestValidator.predicate(
      "items sorted by created_at descending",
      new Date(firstItem.created_at).getTime() >=
        new Date(secondItem.created_at).getTime(),
    );
  }
  // 9. Test pagination with smaller limit (page=1, limit=2)
  const paginatedResponse: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
          sort: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 10. Validate pagination metadata for limited results
  TestValidator.equals(
    "pagination returns limited items",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records still shows total",
    paginatedResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginatedResponse.pagination.pages,
    3,
  );
  // 11. Test page 2 with limit=2
  const page2Response: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 2,
          sort: "desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 returns correct items",
    page2Response.data.length,
    2,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  // 12. Verify page 2 items are different from page 1
  const page1Ids = paginatedResponse.data.map((item) => item.id);
  const page2Ids = page2Response.data.map((item) => item.id);
  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 have no overlapping items",
    !hasOverlap,
  );
  // 13. Verify page 2 items are older than page 1 items (desc sort)
  if (page2Response.data.length > 0 && paginatedResponse.data.length > 0) {
    const page2NewItem = page2Response.data[0];
    const page1LastItem =
      paginatedResponse.data[paginatedResponse.data.length - 1];
    TestValidator.predicate(
      "page 2 items are older than page 1 items",
      new Date(page2NewItem.created_at).getTime() <=
        new Date(page1LastItem.created_at).getTime(),
    );
  }
}