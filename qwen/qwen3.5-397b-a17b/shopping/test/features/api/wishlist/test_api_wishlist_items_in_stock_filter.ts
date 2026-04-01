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
 * Test the in-stock filtering functionality for wishlist items.
 *
 * This test verifies that the inStockOnly filter parameter works correctly
 * when retrieving wishlist items. The test creates a customer account,
 * seller account with multiple products, adds products to the customer's
 * wishlist, and then tests the filtering behavior.
 *
 * Test Flow:
 * 1. Customer registration and authentication
 * 2. Seller registration and authentication
 * 3. Seller creates multiple products
 * 4. Customer adds products to wishlist
 * 5. Retrieve wishlist without inStockOnly filter
 * 6. Retrieve wishlist with inStockOnly=true
 * 7. Verify filtering behavior and response structure
 */
export async function test_api_wishlist_items_in_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates multiple products (4 products for testing)
  const products: IShoppingMallProduct[] = await ArrayUtil.asyncRepeat(
    4,
    async (index) => {
      const product =
        await generate_random_shopping_mall_seller_products_create(
          sellerConnection,
          {
            body: {
              name: `Test Product ${index + 1} - ${RandomGenerator.name()}`,
              description: RandomGenerator.paragraph({ sentences: 3 }),
              category_id: typia.random<string & tags.Format<"uuid">>(),
              base_price: typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1000>
              >(),
            } satisfies IShoppingMallProduct.ICreate,
          },
        );
      typia.assert(product);
      return product;
    },
  );
  // 4. Customer adds all products to wishlist
  const wishlistItems: IShoppingMallWishlistItem[] = [];
  for (const product of products) {
    const wishlistItem =
      await generate_random_shopping_mall_customer_wishlist_items_create(
        customerConnection,
        {
          body: {
            product_id: product.id,
          } satisfies IShoppingMallWishlistItem.ICreate,
        },
      );
    typia.assert(wishlistItem);
    wishlistItems.push(wishlistItem);
  }
  // 5. Retrieve wishlist items WITHOUT inStockOnly filter
  const allWishlistResult =
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
  typia.assert(allWishlistResult);
  // Verify response structure
  TestValidator.predicate(
    "pagination exists",
    allWishlistResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(allWishlistResult.data),
  );
  TestValidator.predicate(
    "has wishlist items",
    allWishlistResult.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page",
    allWishlistResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit set",
    allWishlistResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    allWishlistResult.pagination.records >= allWishlistResult.data.length,
  );
  // Verify each item has available flag (business logic, not type)
  for (const item of allWishlistResult.data) {
    TestValidator.predicate(
      "item has boolean available flag",
      typeof item.available === "boolean",
    );
  }
  // 6. Retrieve wishlist items WITH inStockOnly=true filter
  const filteredWishlistResult =
    await api.functional.shoppingMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "desc",
          inStockOnly: true,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(filteredWishlistResult);
  // Verify filtered response structure
  TestValidator.predicate(
    "filtered pagination exists",
    filteredWishlistResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered data array exists",
    Array.isArray(filteredWishlistResult.data),
  );
  TestValidator.equals(
    "filtered pagination current page",
    filteredWishlistResult.pagination.current,
    1,
  );
  // 7. Validate filtering behavior
  // When inStockOnly=true, all items in result should have available=true
  for (const item of filteredWishlistResult.data) {
    TestValidator.predicate(
      "filtered items are available",
      item.available === true,
    );
  }
  // Verify pagination records is less than or equal to unfiltered
  TestValidator.predicate(
    "filtered records <= unfiltered records",
    filteredWishlistResult.pagination.records <=
      allWishlistResult.pagination.records,
  );
  // 8. Test with inStockOnly=false explicitly
  const explicitFalseResult =
    await api.functional.shoppingMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "desc",
          inStockOnly: false,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(explicitFalseResult);
  // inStockOnly=false should return same count as omitting the parameter
  TestValidator.equals(
    "explicit false matches omitted filter",
    explicitFalseResult.pagination.records,
    allWishlistResult.pagination.records,
  );
}
