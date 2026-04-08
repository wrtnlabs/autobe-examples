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

export async function test_api_product_variant_out_of_stock_included(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // Create a valid category_id for product creation (using a known valid UUID)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a product for variant testing
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create multiple variants with mixed stock levels
  // Variant 1: In stock (stock > 0)
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-TEST-001",
          option_values: JSON.stringify({ color: "red", size: "L" }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<5000>
          >(),
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  // Variant 2: Out of stock (stock = 0)
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-TEST-002",
          option_values: JSON.stringify({ color: "blue", size: "L" }),
          stock_quantity: 0,
          price: null, // Use base price
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // Variant 3: In stock (stock > 0)
  const variant3 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-TEST-003",
          option_values: JSON.stringify({ color: "red", size: "M" }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant3);
  // Variant 4: Out of stock (stock = 0)
  const variant4 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-TEST-004",
          option_values: JSON.stringify({ color: "blue", size: "M" }),
          stock_quantity: 0,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant4);
  // 4. Retrieve all variants for the product
  const variantsPage =
    await api.functional.ecommerceMall.products.variants.list(
      connection, // Use base connection for public endpoint
      {
        productId: product.id,
      },
    );
  typia.assert(variantsPage);
  // 5. Validate that all variants are returned
  TestValidator.equals("all 4 variants returned", variantsPage.data.length, 4);
  // 6. Validate sorting: variants with stock > 0 should appear before stock = 0
  const inStockVariants = variantsPage.data.filter((v) => v.stock_quantity > 0);
  const outOfStockVariants = variantsPage.data.filter(
    (v) => v.stock_quantity === 0,
  );
  TestValidator.equals("in-stock variants count", inStockVariants.length, 2);
  TestValidator.equals(
    "out-of-stock variants count",
    outOfStockVariants.length,
    2,
  );
  // Verify ordering: all in-stock variants come before out-of-stock
  let foundOutOfStock = false;
  for (const variant of variantsPage.data) {
    if (variant.stock_quantity === 0) {
      foundOutOfStock = true;
    } else if (foundOutOfStock && variant.stock_quantity > 0) {
      // If we found out-of-stock first, and then find in-stock, sorting is wrong
      throw new Error(
        "Variants not sorted correctly: out-of-stock variants should appear after in-stock variants",
      );
    }
  }
  // 7. Validate that out-of-stock variants still include complete information
  for (const outOfStockVariant of outOfStockVariants) {
    typia.assert(outOfStockVariant);
    // Verify all required fields are present
    TestValidator.notEquals("variant has id", outOfStockVariant.id, null);
    TestValidator.notEquals(
      "variant has sku_code",
      outOfStockVariant.sku_code,
      null,
    );
    TestValidator.notEquals(
      "variant has option_values",
      outOfStockVariant.option_values,
      null,
    );
    TestValidator.notEquals(
      "variant has price (or null)",
      outOfStockVariant.price,
      undefined,
    );
    TestValidator.equals(
      "variant has correct stock_quantity = 0",
      outOfStockVariant.stock_quantity,
      0,
    );
    TestValidator.notEquals(
      "variant has created_at",
      outOfStockVariant.created_at,
      null,
    );
    TestValidator.notEquals(
      "variant has updated_at",
      outOfStockVariant.updated_at,
      null,
    );
    TestValidator.equals(
      "variant has product reference",
      outOfStockVariant.product.id,
      product.id,
    );
  }
  // 8. Validate that in-stock variants are correctly identified
  for (const inStockVariant of inStockVariants) {
    typia.assert(inStockVariant);
    TestValidator.predicate(
      "in-stock variant has stock > 0",
      inStockVariant.stock_quantity > 0,
    );
    TestValidator.equals(
      "in-stock variant has correct product reference",
      inStockVariant.product.id,
      product.id,
    );
  }
}
