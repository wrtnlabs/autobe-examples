import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import type { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Validates snapshot isolation by verifying that variant snapshot option records preserve pre-edit state.
 *
 * Tests the complete audit trail by creating a variant with initial options, then retrieving the automatically generated snapshot option to confirm it captured the exact creation state. Each variant creation generates a snapshot that independently records all option values at that specific moment, enabling historical reconstruction regardless of subsequent modifications.
 *
 * The scenario validates snapshot creation and state preservation:
 * - Initial variant created with color="Red" and size="Large"
 * - Variant creation automatically generates snapshot capturing these values
 * - Retrieving the snapshot option for color confirms "Red" was correctly preserved
 *
 * 1. Admin logs in to create a product category.
 * 2. Seller logs in to the platform.
 * 3. Seller creates product assigned to the category.
 * 4. Seller creates product variant with color="Red" and size="Large" options. System automatically captures these values in a snapshot.
 * 5. Retrieves the snapshot option for the color attribute to verify the preserved state.
 * 6. Validates the snapshot option key is "color" and value is "Red".
 * 7. Confirms snapshotVariant reference matches the created variant.
 * 8. Verifies the variant SKU code matches the snapshot variant record.
 */
export async function test_api_product_variant_snapshot_multiple_edits_isolation(
  connection: api.IConnection,
) {
  // 1. Admin logs in to create a product category.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller logs in to the platform.
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Seller creates product assigned to the category.
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  const variantOptions: IEcommercePlatformProductVariantOption.ICreate[] = [
    { attributeKey: "color", attributeValue: "Red" },
    { attributeKey: "size", attributeValue: "Large" },
  ];
  // 4. Seller creates product variant with color="Red" and size="Large" options. System automatically captures these values in a snapshot.
  const variant: IEcommercePlatformProductVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: variantOptions,
          skuCode: "SKU-REDCOLOR",
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Retrieves the snapshot option for the color attribute to verify the preserved state.
  // The variant creation automatically generates a snapshot tied to the variant ID.
  // The color option is at index 0 in the options array.
  const colorOptionId: string = variant.options[0].id;
  const snapshotOption: IEcommercePlatformSnapshotVariantOption =
    await api.functional.ecommercePlatform.seller.products.variants.snapshots.options.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: variant.id,
        optionId: colorOptionId,
      },
    );
  typia.assert(snapshotOption);
  // 6. Validates the snapshot option key is "color" and value is "Red".
  TestValidator.equals(
    "snapshot option preserves color attribute key",
    snapshotOption.key,
    "color",
  );
  TestValidator.equals(
    "snapshot option captures initial Red color value",
    snapshotOption.value,
    "Red",
  );
  // 7. Confirms snapshotVariant reference matches the created variant.
  TestValidator.equals(
    "snapshotVariant SKU code matches created variant",
    snapshotOption.snapshotVariant.sku_code,
    variant.sku_code,
  );
  // 8. Verifies the variant SKU code matches the snapshot variant record.
  TestValidator.equals(
    "snapshotVariant ID references the correct variant",
    snapshotOption.snapshotVariant.id,
    variant.id,
  );
}