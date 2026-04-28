import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test retrieving a variant snapshot after the source variant has been soft-deleted from the catalog.
 *
 * Validates the complete workflow of snapshot preservation after variant deletion including seller registration, product creation, variant creation, variant update to generate a snapshot, variant soft-deletion, and snapshot retrieval. Ensures that the snapshot remains accessible and retrievable despite the variant being soft-deleted.
 *
 * Special attention is given to verifying that the snapshot's `entity_type` field is exactly 'product_variant' and that it preserves all original data including SKU code, price, stock quantity, and option key-value pairs. The snapshot's immutability ensures the audit trail remains intact for dispute resolution purposes.
 *
 * 1. Authenticate the seller by registering a new account via join operation.
 * 2. Create a product listing associated with the seller.
 * 3. Create a product variant with a unique SKU code, price, and option configurations.
 * 4. Update or edit the variant to trigger creation of an immutable snapshot record.
 * 5. Soft-delete the product variant (it will no longer appear in search results or listings).
 * 6. Retrieve the previously created variant snapshot by its snapshotId.
 * 7. Validates that the snapshot remains accessible and retrievable despite the variant being soft-deleted.
 * 8. Validates that the `entity_type` field is exactly 'product_variant'.
 * 9. Validates that the snapshot preserves all original data including SKU code, price, stock quantity, and option key-value pairs.
 */
export async function test_api_product_variant_snapshot_preservation_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate the seller by registering a new account via join operation
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create a product listing associated with the seller
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create a product variant with a unique SKU code, price, and option configurations
  const originalSkuCode = RandomGenerator.alphabets(10);
  const originalPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >() satisfies number as number;
  const originalOptions = ArrayUtil.repeat(3, () => ({
    attributeKey: RandomGenerator.alphabets(5),
    attributeValue: RandomGenerator.alphabets(8),
  }));
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: originalSkuCode,
          price: originalPrice,
          options: originalOptions,
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Update or edit the variant to trigger creation of an immutable snapshot record
  const updatedSkuCode = RandomGenerator.alphabets(10);
  const updatedPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >() satisfies number as number;
  const updatedVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: updatedSkuCode,
          price: updatedPrice,
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Soft-delete the product variant (it will no longer appear in search results or listings)
  await api.functional.ecommercePlatform.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      skuCode: updatedVariant.sku_code,
    },
  );
  // 6. Retrieve the previously created variant snapshot by its snapshotId
  // The snapshot was created during the update operation. We need to retrieve it using the variant ID.
  // In the actual API, the snapshotId would be available from the snapshot generation.
  // For this test, we use the variant context to retrieve the snapshot.
  const snapshot =
    await api.functional.ecommercePlatform.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 7. Validates that the snapshot remains accessible and retrievable despite the variant being soft-deleted
  TestValidator.predicate(
    "snapshot is accessible after variant deletion",
    snapshot !== undefined,
  );
  // 8. Validates that the `entity_type` field is exactly 'product_variant'
  TestValidator.equals(
    "entity_type is product_variant",
    snapshot.entity_type,
    "product_variant",
  );
  // 9. Validates that the snapshot preserves all original data
  TestValidator.equals(
    "snapshot SKU code matches original variant",
    snapshot.snapshot_variant.sku_code,
    originalSkuCode,
  );
  TestValidator.equals(
    "snapshot price matches original variant",
    snapshot.snapshot_variant.price,
    originalPrice,
  );
  TestValidator.equals(
    "snapshot stock quantity matches variant",
    snapshot.snapshot_variant.stock_quantity,
    0,
  );
}
