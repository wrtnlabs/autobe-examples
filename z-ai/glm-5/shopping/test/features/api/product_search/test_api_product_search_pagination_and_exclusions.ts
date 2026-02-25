import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_search_pagination_and_exclusions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and approve sellers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.name() } },
  );
  typia.assert(category);
  // Create first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Approve first seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller1Auth.id,
  });
  // Create second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Approve second seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller2Auth.id,
  });
  // 2. Create multiple products from seller 1
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        base_price: 100,
        category_id: category.id,
      },
    },
  );
  typia.assert(product1);
  // Create variants with different prices for product 1 (price range test)
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          price: 80,
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          price: 120,
          optionValues: [{ key: "color", value: "Blue" }],
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant2);
  // Create product 2
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        base_price: 200,
        category_id: category.id,
      },
    },
  );
  typia.assert(product2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: [{ key: "size", value: "M" }],
          stockQuantity: 5,
        },
      },
    );
  typia.assert(variant3);
  // Create product 3 from seller 2
  const product3 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        base_price: 300,
        category_id: category.id,
      },
    },
  );
  typia.assert(product3);
  const variant4 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: { productId: product3.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: [{ key: "type", value: "Standard" }],
          stockQuantity: 15,
        },
      },
    );
  typia.assert(variant4);
  // Create product 4 (will be soft-deleted later)
  const product4 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        base_price: 400,
        category_id: category.id,
      },
    },
  );
  typia.assert(product4);
  const variant5 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product4.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: [{ key: "model", value: "X" }],
          stockQuantity: 3,
        },
      },
    );
  typia.assert(variant5);
  // 3. Test pagination with limit=2
  const page1Result = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 2,
        page: 1,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page1Result);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 has exactly 2 products",
    page1Result.data.length === 2,
  );
  TestValidator.predicate(
    "page 1 records is at least 4",
    page1Result.pagination.records >= 4,
  );
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / 2),
  );
  // 4. Test page 2 returns different products
  const page2Result = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 2,
        page: 2,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  // Verify page 1 and page 2 have different product IDs
  const page1Ids = new Set(page1Result.data.map((p) => p.id));
  const page2Ids = new Set(page2Result.data.map((p) => p.id));
  const hasOverlap = [...page2Ids].some((id) => page1Ids.has(id));
  TestValidator.predicate(
    "page 1 and page 2 have different products",
    !hasOverlap,
  );
  // 5. Test price range display - product1 has variants with different prices
  const priceRangeSearch = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        name: product1.name,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceRangeSearch);
  TestValidator.predicate(
    "price range search returns results",
    priceRangeSearch.data.length > 0,
  );
  const product1Summary = priceRangeSearch.data.find(
    (p) => p.id === product1.id,
  );
  if (product1Summary) {
    // Product with variant price variance should have min_price and max_price
    TestValidator.predicate(
      "product with variant price variance has min_price",
      product1Summary.min_price !== undefined,
    );
    TestValidator.predicate(
      "product with variant price variance has max_price",
      product1Summary.max_price !== undefined,
    );
  }
  // 6. Verify seller shop_name in results
  const allProductsResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { sort: "newest" } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(allProductsResult);
  TestValidator.predicate(
    "search results include seller info",
    allProductsResult.data.every((p) => p.seller !== undefined),
  );
  // Verify shop_name is present
  const productsWithSeller = allProductsResult.data.filter(
    (p) => p.seller !== undefined,
  );
  TestValidator.predicate(
    "sellers have shop name",
    productsWithSeller.every((p) => p.seller!.shopName !== undefined),
  );
  // 7. Verify average_rating is null when no reviews
  TestValidator.predicate(
    "average_rating is null for products without reviews",
    allProductsResult.data.some((p) => p.average_rating === null),
  );
  // 8. Verify review_count is 0 when no reviews
  TestValidator.predicate(
    "review_count is 0 for products without reviews",
    allProductsResult.data.every((p) => p.review_count === 0),
  );
  // 9. Test sorting by newest (created_at DESC)
  const sortedResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        limit: 10,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(sortedResult);
  // Verify products are sorted by created_at DESC
  for (let i = 0; i < sortedResult.data.length - 1; i++) {
    const currentCreatedAt = new Date(
      sortedResult.data[i].created_at,
    ).getTime();
    const nextCreatedAt = new Date(
      sortedResult.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      `products sorted by newest at index ${i}`,
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // 10. Soft-delete product4 and verify exclusion
  await api.functional.shoppingMall.seller.sellers.me.products.erase(
    seller1Connection,
    { productId: product4.id },
  );
  // Search and verify soft-deleted product does not appear
  const afterDeleteResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        name: product4.name,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(afterDeleteResult);
  TestValidator.predicate(
    "soft-deleted product does not appear in search",
    !afterDeleteResult.data.some((p) => p.id === product4.id),
  );
  // Verify total count decreased
  const finalCountResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: { sort: "newest" } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(finalCountResult);
  TestValidator.predicate(
    "total product count decreased after soft-delete",
    finalCountResult.pagination.records < allProductsResult.pagination.records,
  );
}
