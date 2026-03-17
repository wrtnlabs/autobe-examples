import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Setup: Create a test product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // Setup: Create a variant with specific SKU, options, and price
  const createdVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "TEST-SKU-RED-LARGE-001",
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: 149.99,
          stock: 0,
        },
      },
    );
  // Setup: Add inventory records to test stock calculation
  // Add 100 units (restocking)
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: {
        variantId: createdVariant.id,
      },
      body: {
        quantity: 100,
        reason: "Initial restocking from supplier",
      },
    },
  );
  // Subtract 30 units (simulating order)
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: {
        variantId: createdVariant.id,
      },
      body: {
        quantity: -30,
        reason: "Order placement",
      },
    },
  );
  // Test: Retrieve variant using public endpoint (no authentication required)
  const retrievedVariant =
    await api.functional.ecommerceMall.products.variants.at(connection, {
      productId: product.id,
      variantId: createdVariant.id,
    });
  // Validate: Response structure and type safety
  typia.assert(retrievedVariant);
  // Validate: Core variant fields
  TestValidator.equals(
    "SKU code matches input",
    retrievedVariant.skuCode,
    "TEST-SKU-RED-LARGE-001",
  );
  TestValidator.equals(
    "Product ID reference is correct",
    retrievedVariant.productId,
    product.id,
  );
  TestValidator.equals(
    "Price matches variant override",
    retrievedVariant.price,
    149.99,
  );
  // Validate: Stock quantity is dynamically calculated (100 - 30 = 70)
  TestValidator.equals(
    "Stock quantity calculated from inventory records",
    retrievedVariant.stockQuantity,
    70,
  );
  // Validate: Option values array
  TestValidator.equals(
    "Option values count",
    retrievedVariant.optionValues.length,
    2,
  );
  TestValidator.equals(
    "First option name",
    retrievedVariant.optionValues[0]?.optionName,
    "Color",
  );
  TestValidator.equals(
    "First option value",
    retrievedVariant.optionValues[0]?.optionValue,
    "Red",
  );
  TestValidator.equals(
    "Second option name",
    retrievedVariant.optionValues[1]?.optionName,
    "Size",
  );
  TestValidator.equals(
    "Second option value",
    retrievedVariant.optionValues[1]?.optionValue,
    "Large",
  );
  // Validate: Timestamps exist and are valid
  TestValidator.predicate(
    "CreatedAt timestamp exists",
    !!retrievedVariant.createdAt,
  );
  TestValidator.predicate(
    "UpdatedAt timestamp exists",
    !!retrievedVariant.updatedAt,
  );
  TestValidator.equals(
    "DeletedAt is null for active variant",
    retrievedVariant.deletedAt,
    null,
  );
}
