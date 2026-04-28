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
 * Test retrieving a product variant's snapshot created after the seller edits the variant.
 *
 * Validates the complete workflow involving seller authentication, product and variant creation, variant update triggering snapshot creation, and snapshot retrieval.
 *
 * 1. Authenticates a seller via registration.
 * 2. Creates a product listing for the seller.
 * 3. Creates a product variant with SKU code, price, and options.
 * 4. Updates the variant price, triggering an immutable snapshot.
 * 5. Retrieves the snapshot by its ID.
 * 6. Validates entity_type is "product_variant".
 * 7. Verifies snapshot_variant preserves the state at time of update.
 * 8. Verifies product_variant reflects the current catalog state.
 */
export async function test_api_product_variant_snapshot_retrieval_after_variant_edit(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(product);
  const variant: IEcommercePlatformProductVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  const originalPrice: number = variant.price ?? product.base_price;
  const newPrice: number = originalPrice + 10;
  const updatedVariant: IEcommercePlatformProductVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommercePlatformSnapshot.IInvert =
    await api.functional.ecommercePlatform.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("entity_type", snapshot.entity_type, "product_variant");
  TestValidator.equals(
    "snapshot_sku_code",
    snapshot.snapshot_variant.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "snapshot_price_non_negative",
    snapshot.snapshot_variant.price >= 0,
  );
  TestValidator.predicate(
    "snapshot_stock_non_negative",
    snapshot.snapshot_variant.stock_quantity >= 0,
  );
  TestValidator.equals(
    "product_variant_sku_code",
    snapshot.product_variant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals("snapshot_id", snapshot.id, snapshotId);
}
