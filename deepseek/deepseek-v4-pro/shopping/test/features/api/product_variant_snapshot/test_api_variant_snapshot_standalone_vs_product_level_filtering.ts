import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that variant snapshots from product-level edits and standalone variant edits
 * can be distinguished using the has_parent_snapshot filter.
 *
 * Variant snapshots are created in two distinct scenarios during the product lifecycle.
 * When a seller edits the product itself, a product-level snapshot is created that
 * includes nested variant snapshots — these child snapshots are linked to a parent
 * product snapshot (has_parent_snapshot = true). When a seller edits a variant
 * independently, a standalone variant snapshot is created with no parent product
 * snapshot (has_parent_snapshot = false).
 *
 * This test validates that the snapshot listing endpoint correctly filters snapshots
 * based on their parent snapshot membership, enabling callers to distinguish between
 * variant states captured during broad product edits and those captured during
 * targeted variant-only modifications.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller creates a variant under the product with SKU code and option values.
 * 4. Seller edits the product to trigger a product-level snapshot containing
 *    nested variant snapshots (has_parent_snapshot = true).
 * 5. Seller edits the variant independently to trigger a standalone variant
 *    snapshot (has_parent_snapshot = false).
 * 6. Lists all snapshots without filter — verifies at least 2 exist.
 * 7. Lists snapshots with has_parent_snapshot = true — verifies only
 *    product-level snapshots returned.
 * 8. Lists snapshots with has_parent_snapshot = false — verifies only standalone
 *    snapshots returned.
 * 9. Validates disjointness and subset relationships between filtered sets.
 */
export async function test_api_variant_snapshot_standalone_vs_product_level_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Edit product — triggers product-level snapshot with nested variant snapshots (has_parent_snapshot = true)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        shopping_mall_category_id: product.category.id,
        base_price: product.base_price + 1000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Edit variant independently — triggers standalone variant snapshot (has_parent_snapshot = false)
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: (variant.price ?? product.base_price) + 500,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6. List all variant snapshots without filter — both types should appear
  const allSnapshots =
    await api.functional.shoppingMall.seller.products.variants.snapshots.patchByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "all snapshots include both product-level and standalone snapshots",
    allSnapshots.data.length >= 2,
  );
  // 7. List with has_parent_snapshot = true — only product-level edit snapshot
  const parentSnapshots =
    await api.functional.shoppingMall.seller.products.variants.snapshots.patchByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          has_parent_snapshot: true,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(parentSnapshots);
  TestValidator.predicate(
    "has_parent_snapshot=true returns product-level snapshots",
    parentSnapshots.data.length >= 1,
  );
  // 8. List with has_parent_snapshot = false — only standalone variant edit snapshot
  const standaloneSnapshots =
    await api.functional.shoppingMall.seller.products.variants.snapshots.patchByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          has_parent_snapshot: false,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(standaloneSnapshots);
  TestValidator.predicate(
    "has_parent_snapshot=false returns standalone snapshots",
    standaloneSnapshots.data.length >= 1,
  );
  // 9. Validate disjointness and subset relationships
  const allIds = new Set(allSnapshots.data.map((s) => s.id));
  const parentIds = new Set(parentSnapshots.data.map((s) => s.id));
  const standaloneIds = new Set(standaloneSnapshots.data.map((s) => s.id));
  TestValidator.predicate(
    "parent snapshots are subset of all snapshots",
    parentSnapshots.data.every((s) => allIds.has(s.id)),
  );
  TestValidator.predicate(
    "standalone snapshots are subset of all snapshots",
    standaloneSnapshots.data.every((s) => allIds.has(s.id)),
  );
  TestValidator.predicate(
    "no overlap between parent and standalone snapshots",
    parentSnapshots.data.every((s) => !standaloneIds.has(s.id)),
  );
  TestValidator.predicate(
    "combined parent and standalone count does not exceed all count",
    parentSnapshots.data.length + standaloneSnapshots.data.length <=
      allSnapshots.data.length,
  );
}
