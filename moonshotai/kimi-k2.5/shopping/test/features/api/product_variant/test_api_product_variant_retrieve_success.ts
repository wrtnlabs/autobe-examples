import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(adminAuth);
  // Step 2: Create product category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(category);
  // Step 3: Seller authentication for product management
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(sellerAuth);
  // Step 4: Create product under the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  // Step 5: Create product variant with multiple options (Color=Red, Size=Large)
  const variantSku = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: variantSku,
          price: 15000,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // Step 6: Execute - Retrieve the product variant using the GET endpoint
  const retrievedVariant =
    await api.functional.ecommerceMall.products.variants.at(connection, {
      productId: product.id,
      productVariantId: variant.id,
    });
  typia.assert(retrievedVariant);
  // Step 7: Business logic validations
  TestValidator.equals("variant id matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "sku code matches",
    retrievedVariant.skuCode,
    variantSku,
  );
  TestValidator.equals("price matches", retrievedVariant.price, 15000);
  TestValidator.equals(
    "product reference exists",
    retrievedVariant.product.id,
    product.id,
  );
  TestValidator.predicate("createdAt exists", !!retrievedVariant.createdAt);
  TestValidator.predicate("updatedAt exists", !!retrievedVariant.updatedAt);
  TestValidator.equals("deletedAt is null", retrievedVariant.deletedAt, null);
  // Validate variant options
  TestValidator.equals(
    "has 2 options",
    retrievedVariant.variantOptions.length,
    2,
  );
  const colorOption = retrievedVariant.variantOptions.find(
    (opt) => opt.optionName === "Color",
  );
  const sizeOption = retrievedVariant.variantOptions.find(
    (opt) => opt.optionName === "Size",
  );
  TestValidator.equals("Color option value", colorOption?.optionValue, "Red");
  TestValidator.equals("Size option value", sizeOption?.optionValue, "Large");
  // inventoryQuantity should be a number (int32)
  TestValidator.predicate(
    "inventoryQuantity is valid int32",
    Number.isInteger(retrievedVariant.inventoryQuantity),
  );
}
