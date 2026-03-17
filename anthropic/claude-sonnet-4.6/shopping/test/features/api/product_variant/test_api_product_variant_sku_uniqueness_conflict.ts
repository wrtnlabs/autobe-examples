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

export async function test_api_product_variant_sku_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Admin setup ──────────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── 2. Create a product category ────────────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ── 3. Register seller ──────────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ── 4. Create first product WITH an inline variant using the conflicting SKU ─
  const conflictingSku = "GLOBAL-SKU-CONFLICT-001";
  const firstProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          variants: [
            {
              sku: conflictingSku,
              priceOverride: null,
              options: [
                {
                  key: "color",
                  value: "Red",
                  sequence: 0,
                },
              ],
            },
          ],
        },
      },
    );
  typia.assert(firstProduct);
  TestValidator.predicate(
    "first product has the initial variant",
    firstProduct.variants.length >= 1,
  );
  TestValidator.predicate(
    "first product variant has the conflicting SKU",
    firstProduct.variants.some((v) => v.sku === conflictingSku),
  );
  // ── 5. Conflict: duplicate SKU on the same product ──────────────────────────
  await TestValidator.error(
    "duplicate SKU on same product should conflict",
    async () => {
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: firstProduct.id },
          body: {
            sku: conflictingSku,
            priceOverride: null,
            options: [
              {
                key: "color",
                value: "Blue",
                sequence: 0,
              },
            ],
          },
        },
      );
    },
  );
  // ── 6. Create second product (no inline variants) ──────────────────────────
  const secondProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          variants: [],
        },
      },
    );
  typia.assert(secondProduct);
  // ── 7. Conflict: duplicate SKU on a DIFFERENT product (global uniqueness) ───
  await TestValidator.error(
    "duplicate SKU across different products should also conflict",
    async () => {
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: secondProduct.id },
          body: {
            sku: conflictingSku,
            priceOverride: null,
            options: [
              {
                key: "size",
                value: "Large",
                sequence: 0,
              },
            ],
          },
        },
      );
    },
  );
  // ── 8. Positive control: fresh unique SKU succeeds ──────────────────────────
  const uniqueSku = "GLOBAL-SKU-UNIQUE-999";
  const newVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: secondProduct.id },
        body: {
          sku: uniqueSku,
          priceOverride: null,
          options: [
            {
              key: "size",
              value: "Medium",
              sequence: 0,
            },
          ],
        },
      },
    );
  typia.assert(newVariant);
  TestValidator.equals(
    "new variant has the unique SKU",
    newVariant.sku,
    uniqueSku,
  );
}
