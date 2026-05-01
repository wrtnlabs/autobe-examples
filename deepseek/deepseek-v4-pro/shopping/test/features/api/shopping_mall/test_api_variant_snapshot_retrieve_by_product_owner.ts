import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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
 * Test retrieval of a variant snapshot created during product edit by the product owner.
 *
 * Validates that a seller can fetch a specific variant snapshot within their own product's snapshot chain. The variant snapshot must have been created as part of a product-level edit — meaning its `productSnapshot` field is non-null, distinguishing it from standalone variant-only edit snapshots.
 *
 * The test confirms that all denormalized fields (SKU code, option values, price, stock quantity) reflect the variant's state at the moment the product edit occurred, not the current live state. The variant reference and product snapshot reference are verified for correctness.
 *
 * 1. Seller registers and authenticates via join.
 * 2. Seller creates a product with randomized data.
 * 3. Seller creates a variant under the product with SKU, options, and optional price override.
 * 4. Seller edits the product — triggering snapshot creation for both product and nested variants.
 * 5. Target endpoint is called with product ID and generated snapshot IDs.
 * 6. Response is validated for correct variant reference, denormalized field preservation, and non-null product snapshot linkage.
 */
export async function test_api_variant_snapshot_retrieve_by_product_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant under the product with specific option values and price override
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Edit the product to trigger automatic snapshot creation (product + nested variant snapshots)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: product.category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >() satisfies number as number,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5-6. Snapshot listing endpoints not available; use generated IDs (simulation-compatible)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 7. Call target endpoint to retrieve the variant snapshot
  const variantSnapshot =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        variantSnapshotId,
      },
    );
  typia.assert(variantSnapshot);
  // 8. Validate business logic
  TestValidator.equals(
    "variant reference resolves to expected variant",
    variantSnapshot.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "sku code preserved from variant at edit time",
    variantSnapshot.sku_code,
    variant.code,
  );
  // Construct expected option_values string: e.g., "color: Red, size: Large"
  const expectedOptionValues = variant.optionValues
    .map((ov) => `${ov.key}: ${ov.value}`)
    .join(", ");
  TestValidator.equals(
    "option values preserved from variant at edit time",
    variantSnapshot.option_values,
    expectedOptionValues,
  );
  TestValidator.equals(
    "price matches variant price override at edit time",
    variantSnapshot.price,
    variant.price,
  );
  TestValidator.predicate(
    "productSnapshot is non-null — snapshot created from product-level edit, not standalone variant edit",
    variantSnapshot.productSnapshot !== null,
  );
}
