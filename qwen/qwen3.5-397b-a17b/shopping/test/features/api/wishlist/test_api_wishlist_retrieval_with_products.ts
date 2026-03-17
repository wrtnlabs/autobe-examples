import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
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
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

export async function test_api_wishlist_retrieval_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create products for wishlist testing
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Create first product with lower price
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 10000,
      },
    },
  );
  typia.assert(product1);
  // Create second product with higher price
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: 50000,
      },
    },
  );
  typia.assert(product2);
  // 2. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 3. Add products to customer's wishlist
  const wishlistItem1 =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {
          product_id: product1.id,
        },
      },
    );
  typia.assert(wishlistItem1);
  // Small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  const wishlistItem2 =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {
          product_id: product2.id,
        },
      },
    );
  typia.assert(wishlistItem2);
  // 4. Retrieve wishlist with default parameters
  const wishlistDefault =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(wishlistDefault);
  // Validate pagination metadata
  TestValidator.equals(
    "total records count",
    wishlistDefault.pagination.records,
    2,
  );
  TestValidator.equals("total pages", wishlistDefault.pagination.pages, 1);
  TestValidator.equals("current page", wishlistDefault.pagination.current, 1);
  TestValidator.equals("data length", wishlistDefault.data.length, 2);
  // Validate product information in wishlist
  const product1InWishlist = wishlistDefault.data.find(
    (item) => item.product.id === product1.id,
  );
  const product2InWishlist = wishlistDefault.data.find(
    (item) => item.product.id === product2.id,
  );
  TestValidator.predicate(
    "product1 exists in wishlist",
    product1InWishlist !== undefined,
  );
  TestValidator.predicate(
    "product2 exists in wishlist",
    product2InWishlist !== undefined,
  );
  if (product1InWishlist && product2InWishlist) {
    TestValidator.equals(
      "product1 name",
      product1InWishlist.product.name,
      product1.name,
    );
    TestValidator.equals(
      "product1 basePrice",
      product1InWishlist.product.basePrice,
      product1.base_price,
    );
    TestValidator.equals(
      "product1 seller shop_name",
      product1InWishlist.product.seller.shop_name,
      sellerAuth.shop_name,
    );
    TestValidator.equals(
      "product1 category id",
      product1InWishlist.product.category.id,
      product1.category.id,
    );
    TestValidator.equals(
      "product2 name",
      product2InWishlist.product.name,
      product2.name,
    );
    TestValidator.equals(
      "product2 basePrice",
      product2InWishlist.product.basePrice,
      product2.base_price,
    );
    TestValidator.equals(
      "product2 seller shop_name",
      product2InWishlist.product.seller.shop_name,
      sellerAuth.shop_name,
    );
    TestValidator.equals(
      "product2 category id",
      product2InWishlist.product.category.id,
      product2.category.id,
    );
  }
  // 5. Test sorting by 'newest' (most recently added first)
  const wishlistNewest =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: { sort: "newest" },
      },
    );
  typia.assert(wishlistNewest);
  TestValidator.equals(
    "newest sort - first item is product2",
    wishlistNewest.data[0].product.id,
    product2.id,
  );
  TestValidator.equals(
    "newest sort - second item is product1",
    wishlistNewest.data[1].product.id,
    product1.id,
  );
  // 6. Test sorting by 'priceAsc' (lowest price first)
  const wishlistPriceAsc =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: { sort: "priceAsc" },
      },
    );
  typia.assert(wishlistPriceAsc);
  TestValidator.equals(
    "priceAsc sort - first item is product1 (10000)",
    wishlistPriceAsc.data[0].product.id,
    product1.id,
  );
  TestValidator.equals(
    "priceAsc sort - second item is product2 (50000)",
    wishlistPriceAsc.data[1].product.id,
    product2.id,
  );
  // 7. Test sorting by 'priceDesc' (highest price first)
  const wishlistPriceDesc =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: { sort: "priceDesc" },
      },
    );
  typia.assert(wishlistPriceDesc);
  TestValidator.equals(
    "priceDesc sort - first item is product2 (50000)",
    wishlistPriceDesc.data[0].product.id,
    product2.id,
  );
  TestValidator.equals(
    "priceDesc sort - second item is product1 (10000)",
    wishlistPriceDesc.data[1].product.id,
    product1.id,
  );
  // 8. Test pagination - page 1 with limit 1
  const wishlistPage1 =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: { page: 1, limit: 1, sort: "newest" },
      },
    );
  typia.assert(wishlistPage1);
  TestValidator.equals(
    "page 1 - current page",
    wishlistPage1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 - limit", wishlistPage1.pagination.limit, 1);
  TestValidator.equals(
    "page 1 - total records",
    wishlistPage1.pagination.records,
    2,
  );
  TestValidator.equals(
    "page 1 - total pages",
    wishlistPage1.pagination.pages,
    2,
  );
  TestValidator.equals("page 1 - data length", wishlistPage1.data.length, 1);
  TestValidator.equals(
    "page 1 - first item is product2",
    wishlistPage1.data[0].product.id,
    product2.id,
  );
  // 9. Test pagination - page 2 with limit 1
  const wishlistPage2 =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: { page: 2, limit: 1, sort: "newest" },
      },
    );
  typia.assert(wishlistPage2);
  TestValidator.equals(
    "page 2 - current page",
    wishlistPage2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 - limit", wishlistPage2.pagination.limit, 1);
  TestValidator.equals(
    "page 2 - total records",
    wishlistPage2.pagination.records,
    2,
  );
  TestValidator.equals(
    "page 2 - total pages",
    wishlistPage2.pagination.pages,
    2,
  );
  TestValidator.equals("page 2 - data length", wishlistPage2.data.length, 1);
  TestValidator.equals(
    "page 2 - first item is product1",
    wishlistPage2.data[0].product.id,
    product1.id,
  );
}
