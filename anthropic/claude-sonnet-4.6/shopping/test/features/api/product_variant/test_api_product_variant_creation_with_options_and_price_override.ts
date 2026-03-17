import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_creation_with_options_and_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `Category-${RandomGenerator.alphaNumeric(8)}`,
        description: "Test category for variant test",
      },
    },
  );
  typia.assert(category);
  // 2. Seller joins and creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Product-${RandomGenerator.alphaNumeric(8)}`,
        description: "Test product for variant creation",
        base_price: 29.99,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Success scenario — single option variant (no price override)
  const sku1 = `SKU-COLOR-RED-LARGE-${RandomGenerator.alphaNumeric(6)}`;
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: sku1,
          priceOverride: null,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "Red",
              sequence: 0 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(variant1);
  // Validate variant1
  TestValidator.equals("variant1 sku matches", variant1.sku, sku1);
  TestValidator.equals(
    "variant1 priceOverride is null",
    variant1.priceOverride,
    null,
  );
  TestValidator.equals("variant1 deletedAt is null", variant1.deletedAt, null);
  TestValidator.predicate(
    "variant1 has at least one option",
    variant1.options.length >= 1,
  );
  TestValidator.predicate(
    "variant1 option is color Red",
    variant1.options.some((o) => o.key === "color" && o.value === "Red"),
  );
  // 4. Success scenario — multiple options with price override
  const sku2 = `SKU-COLOR-BLUE-SMALL-${RandomGenerator.alphaNumeric(6)}`;
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: sku2,
          priceOverride: 19.99,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "Blue",
              sequence: 0 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "size",
              value: "Small",
              sequence: 1 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(variant2);
  // Validate variant2
  TestValidator.equals("variant2 sku matches", variant2.sku, sku2);
  TestValidator.equals(
    "variant2 priceOverride is 19.99",
    variant2.priceOverride,
    19.99,
  );
  TestValidator.equals("variant2 deletedAt is null", variant2.deletedAt, null);
  TestValidator.predicate(
    "variant2 has two options",
    variant2.options.length === 2,
  );
  TestValidator.predicate(
    "variant2 has color Blue option",
    variant2.options.some((o) => o.key === "color" && o.value === "Blue"),
  );
  TestValidator.predicate(
    "variant2 has size Small option",
    variant2.options.some((o) => o.key === "size" && o.value === "Small"),
  );
  // Ensure SKUs are distinct
  TestValidator.notEquals(
    "variant SKUs are unique",
    variant1.sku,
    variant2.sku,
  );
}
