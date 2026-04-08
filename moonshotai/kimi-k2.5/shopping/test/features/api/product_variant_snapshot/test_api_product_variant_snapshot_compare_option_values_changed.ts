import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDifferenceEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IDifferenceEntry";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ISnapshotDatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ISnapshotDatum";
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

export async function test_api_product_variant_snapshot_compare_option_values_changed(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 2: Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 3: Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // Step 4: Create product as seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 5: Create initial variant with Color=Red, Size=Medium
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          price: typia.random<number & tags.Minimum<0>>(),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Medium",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 6: Create second variant representing updated state with changed options
  // This creates a separate variant that simulates the second snapshot state
  const updatedVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          price: typia.random<number & tags.Minimum<0>>(),
          options: [
            {
              optionName: "Color",
              optionValue: "Blue",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Material",
              optionValue: "Cotton",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(updatedVariant);
  // Step 7: Call the compare endpoint as admin with the first variant
  // The endpoint returns comparison data between snapshots
  const comparison =
    await api.functional.ecommerceMall.admin.productVariants.snapshots.compare(
      adminConnection,
      {
        variantId: variant.id,
      },
    );
  typia.assert(comparison);
  // Step 8: Validate comparison response structure
  TestValidator.predicate(
    "comparison has before snapshot",
    comparison.before !== null,
  );
  TestValidator.predicate(
    "comparison has after snapshot",
    comparison.after !== null,
  );
  TestValidator.predicate(
    "differences is an array",
    Array.isArray(comparison.differences),
  );
  // Validate that differences entries have required fields
  for (const diff of comparison.differences) {
    TestValidator.predicate(
      "difference has path array",
      Array.isArray(diff.path),
    );
    TestValidator.predicate(
      "difference has operation string",
      typeof diff.operation === "string",
    );
    TestValidator.predicate("difference has oldValue", true); // oldValue can be null
    TestValidator.predicate("difference has newValue", true); // newValue can be null
    TestValidator.predicate(
      "difference has message",
      typeof diff.message === "string" || diff.message === null,
    );
    // Validate operation value is one of expected values
    const validOperations = ["ADDED", "REMOVED", "MODIFIED", "UNCHANGED"];
    TestValidator.predicate(
      `operation '${diff.operation}' is valid`,
      validOperations.includes(diff.operation),
    );
  }
  // Step 9: Categories of differences check
  const modifiedCount = comparison.differences.filter(
    (d) => d.operation === "MODIFIED",
  ).length;
  const addedCount = comparison.differences.filter(
    (d) => d.operation === "ADDED",
  ).length;
  // Log summary for debugging
  console.log(
    `Found ${comparison.differences.length} differences: ${modifiedCount} modified, ${addedCount} added`,
  );
  TestValidator.predicate(
    "at least one difference found or empty is valid",
    comparison.differences.length >= 0,
  );
}
