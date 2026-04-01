import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_seller_inventory_low_stock_zero_stock_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create first product with variants (zero stock - no inventory records)
  const product1 = await generate_random_shopping_mall_seller_products_create(
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
  typia.assert(product1);
  // Create variants for product1 (will have zero stock)
  const variant1a =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: `SKU-ZERO-1A-${RandomGenerator.alphaNumeric(12)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1a);
  const variant1b =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: `SKU-ZERO-1B-${RandomGenerator.alphaNumeric(12)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1b);
  // 3. Create second product with variants (zero stock - no inventory records)
  const product2 = await generate_random_shopping_mall_seller_products_create(
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
  typia.assert(product2);
  // Create variant for product2 (will have zero stock)
  const variant2a =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: `SKU-ZERO-2A-${RandomGenerator.alphaNumeric(12)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2a);
  // 4. Query low-stock products with threshold=5
  // Products with zero stock (no inventory records) should be included
  const lowStockResponse =
    await api.functional.shoppingMall.seller.products.inventory.low_stock.index(
      sellerConnection,
      {
        body: {
          threshold: 5 satisfies number as number & tags.Type<"int32">,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 50 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallProduct.ILowStockRequest,
      },
    );
  typia.assert(lowStockResponse);
  // 5. Validate response structure
  TestValidator.predicate(
    "has pagination",
    lowStockResponse.pagination !== null,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(lowStockResponse.data),
  );
  TestValidator.equals(
    "pagination current is 1",
    lowStockResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 50",
    lowStockResponse.pagination.limit,
    50,
  );
  // 6. Find zero-stock products in results
  const zeroStockProduct1 = lowStockResponse.data.find(
    (p) => p.id === product1.id,
  );
  const zeroStockProduct2 = lowStockResponse.data.find(
    (p) => p.id === product2.id,
  );
  // 7. Validate zero-stock products appear with current_stock=0
  TestValidator.predicate(
    "product1 found in low-stock results",
    zeroStockProduct1 !== undefined,
  );
  TestValidator.predicate(
    "product2 found in low-stock results",
    zeroStockProduct2 !== undefined,
  );
  // Validate product1 zero stock
  TestValidator.equals(
    "product1 current_stock is 0",
    zeroStockProduct1!.current_stock,
    0,
  );
  TestValidator.equals(
    "product1 threshold matches request",
    zeroStockProduct1!.threshold,
    5,
  );
  TestValidator.predicate(
    "product1 has sku_codes array",
    Array.isArray(zeroStockProduct1!.sku_codes),
  );
  TestValidator.predicate(
    "product1 sku_codes includes variant1a",
    zeroStockProduct1!.sku_codes.includes(variant1a.skuCode),
  );
  TestValidator.predicate(
    "product1 sku_codes includes variant1b",
    zeroStockProduct1!.sku_codes.includes(variant1b.skuCode),
  );
  TestValidator.equals(
    "product1 name matches",
    zeroStockProduct1!.name,
    product1.name,
  );
  // Validate product2 zero stock
  TestValidator.equals(
    "product2 current_stock is 0",
    zeroStockProduct2!.current_stock,
    0,
  );
  TestValidator.equals(
    "product2 threshold matches request",
    zeroStockProduct2!.threshold,
    5,
  );
  TestValidator.predicate(
    "product2 has sku_codes array",
    Array.isArray(zeroStockProduct2!.sku_codes),
  );
  TestValidator.predicate(
    "product2 sku_codes includes variant2a",
    zeroStockProduct2!.sku_codes.includes(variant2a.skuCode),
  );
  TestValidator.equals(
    "product2 name matches",
    zeroStockProduct2!.name,
    product2.name,
  );
  // 8. Validate all returned products have stock below threshold
  for (const product of lowStockResponse.data) {
    TestValidator.predicate(
      `product ${product.id} stock below threshold`,
      product.current_stock < product.threshold,
    );
    TestValidator.predicate(
      `product ${product.id} has non-empty sku_codes`,
      product.sku_codes.length > 0,
    );
  }
}