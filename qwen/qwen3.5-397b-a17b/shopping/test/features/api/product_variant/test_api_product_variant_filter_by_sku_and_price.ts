import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product variant filtering and sorting capabilities.
 *
 * This test validates the variants index endpoint filtering and sorting functionality:
 * 1. Seller registration and authentication
 * 2. Product creation for variant testing
 * 3. Filter variants by SKU code search term
 * 4. Filter variants by price range (price_override_min/max)
 * 5. Sort variants by SKU code (ascending/descending)
 * 6. Sort variants by price override (ascending/descending)
 * 7. Verify combined filters work correctly
 */
export async function test_api_product_variant_filter_by_sku_and_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product for variant testing
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Test variants listing with search filter by SKU code
  const searchResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "SKU",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(searchResult);
  // 4. Test variants listing with price range filter
  const minPrice = 1000;
  const maxPrice = 50000;
  const priceFilteredResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          price_override_min: minPrice,
          price_override_max: maxPrice,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceFilteredResult);
  // 5. Test variants listing sorted by SKU code ascending
  const skuAscResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort_field: "sku_code",
          sort_direction: "asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuAscResult);
  // 6. Test variants listing sorted by SKU code descending
  const skuDescResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort_field: "sku_code",
          sort_direction: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuDescResult);
  // 7. Test variants listing sorted by price override ascending
  const priceAscResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort_field: "price_override",
          sort_direction: "asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceAscResult);
  // 8. Test variants listing sorted by price override descending
  const priceDescResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort_field: "price_override",
          sort_direction: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceDescResult);
  // 9. Test combined filters (search + price range + sorting)
  const combinedResult =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "TEST",
          price_override_min: minPrice,
          price_override_max: maxPrice,
          sort_field: "sku_code",
          sort_direction: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(combinedResult);
}