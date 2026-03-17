import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_items_list_keyword_search(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // 1. Setup actors with isolated connections
  // =========================================================================
  // 1-1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 1-2. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 1-3. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // =========================================================================
  // 2. Admin creates a product category
  // =========================================================================
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics " + RandomGenerator.alphabets(6),
        description: "Electronics category for test",
      },
    },
  );
  typia.assert(category);
  // =========================================================================
  // 3. Seller creates 3 products with distinct names
  //    - "Apple Watch Pro" (contains "Apple")
  //    - "Samsung Galaxy Buds" (does NOT contain "Apple")
  //    - "Apple iPhone 15" (contains "Apple")
  // =========================================================================
  const productAppleWatch =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Apple Watch Pro",
          description: "A premium smartwatch from Apple",
          base_price: 399.99,
          categoryId: category.id,
        },
      },
    );
  typia.assert(productAppleWatch);
  const productSamsung =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Samsung Galaxy Buds",
          description: "Wireless earbuds from Samsung",
          base_price: 149.99,
          categoryId: category.id,
        },
      },
    );
  typia.assert(productSamsung);
  const productAppleIphone =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Apple iPhone 15",
          description: "Latest iPhone from Apple",
          base_price: 999.99,
          categoryId: category.id,
        },
      },
    );
  typia.assert(productAppleIphone);
  // =========================================================================
  // 4. Customer adds all 3 products to wishlist
  // =========================================================================
  const wishlistItem1 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: productAppleWatch.id,
        },
      },
    );
  typia.assert(wishlistItem1);
  const wishlistItem2 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: productSamsung.id,
        },
      },
    );
  typia.assert(wishlistItem2);
  const wishlistItem3 =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: productAppleIphone.id,
        },
      },
    );
  typia.assert(wishlistItem3);
  // =========================================================================
  // 5. Test execution — search for "Apple" (should return 2 results)
  // =========================================================================
  const appleSearchResult =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customerConnection,
      {
        body: {
          search: "Apple",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(appleSearchResult);
  // Verify exactly 2 Apple products are returned
  TestValidator.equals(
    "Apple search should return 2 records",
    appleSearchResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "Apple search data array should have 2 items",
    appleSearchResult.data.length,
    2,
  );
  // Verify each returned item has "Apple" in the product name (case-insensitive)
  for (const item of appleSearchResult.data) {
    TestValidator.predicate(
      "Each result product name should contain 'Apple'",
      item.product.name.toLowerCase().includes("apple"),
    );
  }
  // Verify Samsung product is NOT in the Apple search results
  const samsungInAppleResults = appleSearchResult.data.some(
    (item) => item.product.id === productSamsung.id,
  );
  TestValidator.predicate(
    "Samsung product should NOT be in Apple search results",
    !samsungInAppleResults,
  );
  // =========================================================================
  // 6. Test execution — no match search ("NonExistentProduct")
  // =========================================================================
  const noMatchResult =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customerConnection,
      {
        body: {
          search: "NonExistentProduct",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(noMatchResult);
  // Verify 0 records returned
  TestValidator.equals(
    "Non-existent search should return 0 records",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "Non-existent search data array should be empty",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "Non-existent search should show 0 pages",
    noMatchResult.pagination.pages,
    0,
  );
  // =========================================================================
  // 7. Test execution — case-insensitive search ("apple" lowercase)
  // =========================================================================
  const lowercaseAppleResult =
    await api.functional.shoppingMall.customer.wishlistItems.index(
      customerConnection,
      {
        body: {
          search: "apple",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(lowercaseAppleResult);
  // Verify same 2 Apple products are returned (case-insensitive match)
  TestValidator.equals(
    "Lowercase 'apple' search should return 2 records",
    lowercaseAppleResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "Lowercase 'apple' search data array should have 2 items",
    lowercaseAppleResult.data.length,
    2,
  );
  // Verify each returned item has "apple" in the product name (case-insensitive)
  for (const item of lowercaseAppleResult.data) {
    TestValidator.predicate(
      "Each lowercase result product name should contain 'apple'",
      item.product.name.toLowerCase().includes("apple"),
    );
  }
  // Verify the same two Apple products are returned
  const lowercaseAppleProductIds = new Set(
    lowercaseAppleResult.data.map((item) => item.product.id),
  );
  TestValidator.predicate(
    "Apple Watch Pro should be in lowercase apple search results",
    lowercaseAppleProductIds.has(productAppleWatch.id),
  );
  TestValidator.predicate(
    "Apple iPhone 15 should be in lowercase apple search results",
    lowercaseAppleProductIds.has(productAppleIphone.id),
  );
}
