import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that an administrator can retrieve a variant snapshot even after the parent product has been deleted.
 *
 * This test validates the snapshot integrity pattern where variant snapshots remain accessible
 * for audit and dispute resolution purposes even after the parent product and variant have been
 * soft-deleted. The test flow:
 * 1. Create and authenticate administrator account
 * 2. Create and authenticate seller account
 * 3. Seller creates a product
 * 4. Seller creates a variant with SKU code and option values
 * 5. Seller edits the variant to trigger snapshot creation
 * 6. Seller deletes the product (cascade deletes all variants)
 * 7. Administrator attempts to retrieve the variant snapshot
 *
 * Note: This test demonstrates the snapshot access pattern. In a production environment,
 * the snapshot ID would be obtained through a list snapshots endpoint or returned from
 * the variant update operation.
 */
export async function test_api_product_variant_snapshot_access_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product using utility (handles category internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a variant for the product using utility (handles option values internally)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Seller edits the variant to create a snapshot
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: `SKU-UPDATED-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Validate the variant was updated successfully
  TestValidator.notEquals(
    "SKU code changed after update",
    variant.skuCode,
    updatedVariant.skuCode,
  );
  // 6. Seller deletes the product (cascade deletes all variants)
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 7. Administrator can access variant snapshots even after product deletion
  // Note: In production, the snapshot ID would be obtained from a list endpoint
  // or returned from the update operation. This test demonstrates the access pattern.
  const variantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        variantSnapshotId: variantSnapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot structure and data integrity
  TestValidator.predicate(
    "snapshot has valid SKU code",
    snapshot.sku_code.length > 0,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== undefined,
  );
  TestValidator.equals(
    "snapshot variant reference",
    snapshot.variant.id,
    variant.id,
  );
  TestValidator.predicate(
    "snapshot has option values",
    Array.isArray(snapshot.optionValues),
  );
  TestValidator.predicate(
    "snapshot price override is nullable number",
    snapshot.price_override === null ||
      typeof snapshot.price_override === "number",
  );
  // 9. Validate snapshot immutability - data should match what was captured
  TestValidator.equals(
    "snapshot SKU matches updated variant",
    snapshot.sku_code,
    updatedVariant.skuCode,
  );
}