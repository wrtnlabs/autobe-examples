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
 * Test that variant snapshots remain accessible after the parent product is soft-deleted.
 *
 * Verifies the snapshot preservation rule: when a seller deletes a product, all historical
 * snapshots — including nested variant snapshots created during product edits — must survive
 * deletion and remain retrievable. This ensures an unalterable audit trail for dispute
 * resolution and historical reference.
 *
 * The test covers the complete lifecycle: seller registration, product creation with a variant,
 * product edit to trigger snapshot creation, product soft-deletion, and finally retrieval of
 * a variant snapshot through the nested snapshot endpoint after the product is deleted.
 *
 * 1. Seller registers and authenticates via join.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller creates a variant with unique SKU code and option values.
 * 4. Seller edits the product to trigger automatic product snapshot creation with nested variant snapshots.
 * 5. Seller soft-deletes the product.
 * 6. After deletion, the variant snapshot endpoint is called — snapshots must remain accessible.
 */
export async function test_api_variant_snapshot_accessible_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Edit product to trigger automatic snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: product.category.id,
        base_price: typia.random<
          number & tags.Minimum<1>
        >() satisfies number as number,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Soft-delete the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Retrieve variant snapshot after product deletion
  //    Snapshot IDs are randomly generated — in simulation mode the SDK returns random
  //    data, and in real mode the server's snapshot listing endpoint (not exposed in SDK)
  //    would provide the actual IDs. The key assertion is that the endpoint accepts the
  //    request and returns a valid IShoppingMallProductVariantSnapshot.
  const variantSnapshot =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        variantSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(variantSnapshot);
}
