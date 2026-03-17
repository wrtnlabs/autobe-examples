import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
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
 * Test that a seller can compare two snapshots of their own variant to identify what changed between edits.
 *
 * This validates the audit trail feature for tracking product variant evolution over time.
 */
export async function test_api_variant_snapshot_compare_seller_own_product(
  connection: api.IConnection,
) {
  // Create authenticated connections
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Authenticate as admin
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 49.99,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create variant with initial values: SKU "ORIG-SKU-001", Color Red, Size Large, price $49.99
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "ORIG-SKU-001",
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
          price: 49.99,
          stock: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // First edit: Change price to $59.99 and Color to Blue
  // This creates first snapshot capturing original state
  const updatedVariant1 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: 59.99,
          optionValues: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Large" },
          ],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant1);
  // Second edit: Change SKU to "NEW-SKU-002"
  // This creates second snapshot capturing state after first edit
  const updatedVariant2 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: "NEW-SKU-002",
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant2);
  // Generate snapshot IDs for comparison
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const otherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Compare the two snapshots
  const result =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.compare.compareSnapshots(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId,
        otherSnapshotId,
      },
    );
  typia.assert(result);
  // Verify differences
  const { differences } = result;
  // Check price change: 49.99 -> 59.99
  const priceDiff = differences.find((d) => d.fieldName === "price");
  if (priceDiff) {
    TestValidator.equals("price change old value", priceDiff.oldValue, "49.99");
    TestValidator.equals("price change new value", priceDiff.newValue, "59.99");
  }
  // Check Color option change: Red -> Blue
  const colorDiff = differences.find(
    (d) => d.fieldName.toLowerCase() === "color",
  );
  if (colorDiff) {
    TestValidator.equals("color change old value", colorDiff.oldValue, "Red");
    TestValidator.equals("color change new value", colorDiff.newValue, "Blue");
  }
  // Check SKU change: "ORIG-SKU-001" -> "NEW-SKU-002"
  const skuDiff = differences.find(
    (d) =>
      d.fieldName.toLowerCase() === "skucode" || d.fieldName === "sku_code",
  );
  if (skuDiff) {
    TestValidator.equals(
      "sku change old value",
      skuDiff.oldValue,
      "ORIG-SKU-001",
    );
    TestValidator.equals(
      "sku change new value",
      skuDiff.newValue,
      "NEW-SKU-002",
    );
  }
  // Verify differences are sorted by field name
  const fieldNames = differences.map((d) => d.fieldName);
  const sortedFieldNames = [...fieldNames].sort();
  TestValidator.equals(
    "differences sorted by field name",
    fieldNames,
    sortedFieldNames,
  );
}
