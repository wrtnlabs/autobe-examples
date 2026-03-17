import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
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
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test product variant creation with full details including SKU code, option values,
 * price override, and initial stock quantity. Validates the complete variant creation
 * workflow and verifies all response fields including generated UUID, product association,
 * option values, and stock quantity.
 */
export async function test_api_product_variant_create_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a category for the parent product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: typia.random<string>(),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
    },
  });
  // 4. Create parent product using the created category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1>>(),
        description: typia.random<string & tags.MinLength<1>>(),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<0>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create product variant with full details
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "SKU-RED-LARGE-001",
          options: [
            { optionName: "color", optionValue: "Red" },
            { optionName: "size", optionValue: "Large" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: 29.99,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 6. Validate variant properties
  TestValidator.equals(
    "variant SKU matches input",
    variant.skuCode,
    "SKU-RED-LARGE-001",
  );
  TestValidator.equals("variant price matches input", variant.price, 29.99);
  TestValidator.equals(
    "variant stock quantity matches input",
    variant.stockQuantity,
    100,
  );
  TestValidator.equals(
    "variant productId matches parent product",
    variant.productId,
    product.id,
  );
  TestValidator.predicate(
    "variant has valid UUID id",
    typeof variant.id === "string" && variant.id.length > 0,
  );
  TestValidator.equals(
    "variant has option values",
    variant.optionValues.length,
    2,
  );
  TestValidator.equals(
    "variant has color option",
    variant.optionValues.some(
      (o) => o.optionName === "color" && o.optionValue === "Red",
    ),
    true,
  );
  TestValidator.equals(
    "variant has size option",
    variant.optionValues.some(
      (o) => o.optionName === "size" && o.optionValue === "Large",
    ),
    true,
  );
}
