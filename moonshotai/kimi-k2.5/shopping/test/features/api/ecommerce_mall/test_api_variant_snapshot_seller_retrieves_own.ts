import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
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

export async function test_api_variant_snapshot_seller_retrieves_own(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup - create category for product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 2: Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 3: Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // Step 4: Create variant with initial values
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const originalPrice = 100;
  const originalOptions = [
    { optionName: "Color", optionValue: "Red" },
    { optionName: "Size", optionValue: "Large" },
  ] satisfies IEcommerceMallProductVariantOption.ICreate[];
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: originalSkuCode,
          options: originalOptions,
          price: originalPrice,
          stock: 10,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // Verify variant was created with correct values
  TestValidator.equals(
    "variant skuCode matches",
    variant.skuCode,
    originalSkuCode,
  );
  TestValidator.equals("variant price matches", variant.price, originalPrice);
  TestValidator.equals(
    "variant options count",
    variant.optionValues.length,
    originalOptions.length,
  );
  // Step 5: Update variant to trigger snapshot creation
  const newSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const newPrice = 150;
  const newOptions = [
    { optionName: "Color", optionValue: "Blue" },
    { optionName: "Size", optionValue: "Small" },
  ] satisfies IEcommerceMallProductVariantOption.ICreate[];
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: newSkuCode,
          price: newPrice,
          optionValues: newOptions,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Verify variant was updated
  TestValidator.equals(
    "updated variant skuCode changed",
    updatedVariant.skuCode,
    newSkuCode,
  );
  TestValidator.equals(
    "updated variant price changed",
    updatedVariant.price,
    newPrice,
  );
  // Step 6: Retrieve the snapshot
  // Extract snapshotId from update response if available, otherwise generate for test
  let snapshotId: string & tags.Format<"uuid">;
  if (
    "snapshotId" in updatedVariant &&
    typeof updatedVariant.snapshotId === "string"
  ) {
    snapshotId = updatedVariant.snapshotId as string & tags.Format<"uuid">;
  } else {
    snapshotId = typia.random<string & tags.Format<"uuid">>();
  }
  const snapshot =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Step 7: Validate snapshot contains complete data
  TestValidator.equals(
    "snapshot productVariantId matches",
    snapshot.productVariantId,
    variant.id,
  );
  TestValidator.equals(
    "snapshot skuCode matches original",
    snapshot.skuCode,
    originalSkuCode,
  );
  TestValidator.equals(
    "snapshot price matches original",
    snapshot.price,
    originalPrice,
  );
  TestValidator.predicate("snapshot createdAt is valid timestamp", () => {
    return !Number.isNaN(Date.parse(snapshot.createdAt));
  });
  // Validate optionValues array contains all original key-value pairs
  TestValidator.equals(
    "snapshot optionValues count",
    snapshot.optionValues.length,
    originalOptions.length,
  );
  for (const originalOpt of originalOptions) {
    const matchingOpt = snapshot.optionValues.find(
      (opt) =>
        opt.optionName === originalOpt.optionName &&
        opt.optionValue === originalOpt.optionValue,
    );
    TestValidator.predicate(
      `snapshot contains option ${originalOpt.optionName}:${originalOpt.optionValue}`,
      matchingOpt !== undefined,
    );
  }
}
