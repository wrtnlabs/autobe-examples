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
 * Test administrator retrieval of immutable product variant snapshot after seller update.
 *
 * Validates the complete workflow from administrative authentication and category creation to seller product setup, variant creation, and variant update triggering snapshot generation. The test ensures that the admin can retrieve the specific snapshot record by its unique identifier and verify that it accurately preserves the exact SKU code, price, stock quantity, and all normalized option key-value pairs as they existed at the moment of the update.
 *
 * Special attention is given to verifying that the returned snapshot record correctly identifies the entity_type as 'product_variant', includes the precise creation timestamp, and contains the nested snapshot variant data with complete option configurations.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller registers, authenticates, and creates a product assigned to the category.
 * 3. Seller creates a product variant with specific SKU, price, and attribute options.
 * 4. Seller updates the variant, which automatically triggers immutable snapshot creation.
 * 5. Administrator retrieves the snapshot by its specific ID.
 * 6. Validates that the snapshot entity_type, timestamps, SKU code, price, stock quantity, and option configurations match the updated variant state.
 */
export async function test_api_variant_snapshot_admin_retrieval_after_update(
  connection: api.IConnection,
) {
  // 1. Administrator authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Administrator creates a product category
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  // 4. Seller creates a product assigned to the category
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>,
      },
    );
  typia.assert(product);
  // 5. Seller creates a product variant with specific SKU, price, and options
  const variantOptions = ArrayUtil.repeat(1, () => ({
    attributeKey: RandomGenerator.alphabets(3),
    attributeValue: RandomGenerator.alphabets(4),
  }));
  const variant: IEcommercePlatformProductVariant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
          options: variantOptions,
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Seller updates the variant, triggering automatic immutable snapshot creation
  const updatedVariant: IEcommercePlatformProductVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
          options: {
            attribute_key: RandomGenerator.alphabets(3),
            attribute_value: RandomGenerator.alphabets(4),
          } satisfies IEcommercePlatformProductVariantOption.IUpdate,
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Administrator retrieves the snapshot by its specific ID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot: IEcommercePlatformSnapshot.IInvert =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot data integrity
  TestValidator.equals(
    "entity_type is product_variant",
    snapshot.entity_type,
    "product_variant",
  );
  TestValidator.equals(
    "snapshot sku_code matches updated variant",
    snapshot.snapshot_variant.sku_code,
    updatedVariant.sku_code,
  );
  TestValidator.equals(
    "snapshot price matches updated variant",
    snapshot.snapshot_variant.price,
    updatedVariant.price ?? 0,
  );
  TestValidator.equals(
    "snapshot stock_quantity matches updated variant",
    snapshot.snapshot_variant.stock_quantity,
    updatedVariant.stock_quantity,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot variant has creation timestamp",
    snapshot.snapshot_variant.created_at.length > 0,
  );
}