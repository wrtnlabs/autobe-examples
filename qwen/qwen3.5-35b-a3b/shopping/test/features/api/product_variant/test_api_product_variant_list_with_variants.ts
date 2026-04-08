import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_list_with_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Wait for approval (simulate with mock)
  await new Promise<void>((resolve) => {
    sellerAuth.approval_status === "approved"
      ? resolve()
      : setTimeout(resolve, 100);
  });
  // 3. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product with Variants",
        description: "A test product with multiple variants",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create 3 variants with different stock levels
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-001",
          option_values: JSON.stringify({ color: "red", size: "M" }),
          stock_quantity: 50,
          price: null, // uses base price
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-002",
          option_values: JSON.stringify({ color: "blue", size: "L" }),
          stock_quantity: 10,
          price: product.base_price + 500, // price override
        },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-003",
          option_values: JSON.stringify({ color: "green", size: "S" }),
          stock_quantity: 0, // out of stock
          price: null, // uses base price
        },
      },
    );
  typia.assert(variant3);
  // 5. List variants (no auth required - public endpoint)
  const variantsResponse =
    await api.functional.ecommerceMall.products.variants.list(connection, {
      productId: product.id,
    });
  typia.assert(variantsResponse);
  // 6. Validate pagination
  TestValidator.equals(
    "pagination current",
    variantsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    variantsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records",
    variantsResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages",
    variantsResponse.pagination.pages,
    1,
  );
  // 7. Validate variants count
  TestValidator.equals("variants data length", variantsResponse.data.length, 3);
  // 8. Validate sorting (stock_quantity DESC, then created_at ASC)
  const variants = variantsResponse.data;
  TestValidator.equals(
    "first variant has highest stock",
    variants[0].stock_quantity,
    50,
  );
  TestValidator.equals(
    "second variant has medium stock",
    variants[1].stock_quantity,
    10,
  );
  TestValidator.equals(
    "third variant has zero stock",
    variants[2].stock_quantity,
    0,
  );
  // 9. Validate all variants include required fields
  for (const variant of variants) {
    typia.assert(variant);
    typia.assert(variant.product);
    TestValidator.predicate("variant has valid id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has valid sku_code",
      variant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "variant has valid option_values",
      variant.option_values !== undefined,
    );
    TestValidator.predicate(
      "variant has valid price",
      variant.price !== undefined,
    );
    TestValidator.predicate(
      "variant has valid stock_quantity",
      variant.stock_quantity >= 0,
    );
    TestValidator.predicate(
      "variant has created_at",
      variant.created_at !== undefined,
    );
    TestValidator.predicate(
      "variant has updated_at",
      variant.updated_at !== undefined,
    );
    TestValidator.predicate(
      "variant has deleted_at",
      variant.deleted_at === null,
    );
    TestValidator.predicate(
      "variant has product reference",
      variant.product.id !== undefined,
    );
  }
  // 10. Validate SKU codes are unique within product
  const skuCodes = variants.map((v) => v.sku_code);
  const uniqueSkuCodes = new Set(skuCodes);
  TestValidator.equals(
    "sku codes are unique",
    uniqueSkuCodes.size,
    skuCodes.length,
  );
  // 11. Validate price override works correctly
  const variantWithOverride = variants.find((v) => v.sku_code === "SKU-002");
  TestValidator.predicate(
    "variant with price override has higher price",
    variantWithOverride && variantWithOverride.price === product.base_price + 500 ? true : false,
  );
  // 12. Validate option_values JSON structure
  const variant1Parsed = JSON.parse(variants[0].option_values);
  TestValidator.equals("variant 1 color", variant1Parsed.color, "red");
  TestValidator.equals("variant 1 size", variant1Parsed.size, "M");
}