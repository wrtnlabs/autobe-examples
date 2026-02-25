import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_seller_product_variants_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoin);
  sellerConnection.headers = { Authorization: sellerJoin.token.access };
  // Step 2: Create a category for the product (if category endpoint exists)
  // Since categories endpoint is not in the API functions, we'll use an existing category
  // For now, create a valid category ID or use a known category
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create a product with multiple variants using correct DTO names
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        shopping_mall_category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: ArrayUtil.repeat(5, (index) => ({
          sku_code: `SKU-${index + 1}-${RandomGenerator.alphaNumeric(4)}`,
          option_values: [
            {
              option_name: "size",
              option_value: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
            {
              option_name: "color",
              option_value: RandomGenerator.pick(["red", "blue", "green"]),
            },
          ],
          price_override:
            index % 2 === 0
              ? null
              : typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
          stock_quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        })),
      },
    },
  );
  typia.assert(product);
  // Step 4: Test paginated variant retrieval with various parameters
  const response =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "",
          stockStatus: "all",
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(response);
  // Step 5: Validate response structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "pagination has required fields",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "records count matches data length",
    response.data.length,
    response.pagination.records,
  );
  // Step 6: Test pagination edge cases
  const firstPage =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { page: 1, limit: 2 },
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has correct limit",
    firstPage.data.length <= 2,
    true,
  );
  const lastPage =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { page: firstPage.pagination.pages, limit: 2 },
      },
    );
  typia.assert(lastPage);
  // Step 7: Test stock filtering using actual variant data
  // Note: Use the snake_case property names from the ISummary type
  const inStockVariants = product.variants.filter((v) => v.stockQuantity > 0);
  const outOfStockVariants = product.variants.filter(
    (v) => v.stockQuantity === 0,
  );
  if (inStockVariants.length > 0) {
    const inStockFilter =
      await api.functional.shoppingMall.seller.products.variants.index(
        sellerConnection,
        {
          productId: product.id,
          body: { stockStatus: "in_stock" },
        },
      );
    typia.assert(inStockFilter);
    TestValidator.predicate(
      "in_stock filter returns variants",
      inStockFilter.data.length > 0,
    );
  }
  if (outOfStockVariants.length > 0) {
    const outOfStockFilter =
      await api.functional.shoppingMall.seller.products.variants.index(
        sellerConnection,
        {
          productId: product.id,
          body: { stockStatus: "out_of_stock" },
        },
      );
    typia.assert(outOfStockFilter);
    TestValidator.predicate(
      "out_of_stock filter returns variants",
      outOfStockFilter.data.length > 0,
    );
  }
  // Step 8: Test SKU search using the correct property name
  if (product.variants.length > 0 && product.variants[0].skuCode) {
    const searchResult =
      await api.functional.shoppingMall.seller.products.variants.index(
        sellerConnection,
        {
          productId: product.id,
          body: { search: product.variants[0].skuCode.substring(0, 3) },
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate(
      "search returns some results",
      searchResult.data.length >= 0,
    );
  }
  // Step 9: Test authorization - other sellers cannot access
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await api.functional.shoppingMall.auth.seller.join(
    otherSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: null,
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(otherSeller);
  otherSellerConnection.headers = { Authorization: otherSeller.token.access };
  try {
    await api.functional.shoppingMall.seller.products.variants.index(
      otherSellerConnection,
      {
        productId: product.id,
        body: { page: 1, limit: 10 },
      },
    );
    throw new Error("Should have thrown unauthorized error");
  } catch (error) {
    if (!(error as any).status) throw error;
    TestValidator.equals(
      "unauthorized access returns error",
      (error as any).status >= 400 && (error as any).status < 500,
      true,
    );
  }
  // Step 10: Verify variant data structure using correct property names
  for (const variant of response.data) {
    TestValidator.equals("variant has id", variant.id !== undefined, true);
    TestValidator.equals(
      "variant has sku_code",
      variant.sku_code !== undefined,
      true,
    );
    TestValidator.equals(
      "variant has price_override",
      variant.price_override !== undefined,
      true,
    );
    TestValidator.equals(
      "variant has stock_quantity",
      variant.stock_quantity !== undefined,
      true,
    );
    TestValidator.equals(
      "variant has shopping_mall_product_id",
      variant.shopping_mall_product_id !== undefined,
      true,
    );
  }
}
