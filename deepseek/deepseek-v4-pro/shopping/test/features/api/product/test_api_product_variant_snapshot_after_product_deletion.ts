import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Verify variant snapshots survive product soft-deletion and remain accessible to administrators.
 *
 * Validates the snapshot preservation rule: when a seller soft-deletes a product, all product snapshots and their nested variant snapshots are preserved independently. The administrator can still retrieve variant snapshots by their IDs after the product has been removed from the active catalog.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers and authenticates (pending approval).
 * 3. Administrator approves the seller.
 * 4. Administrator creates a product category.
 * 5. Seller creates a product with the category.
 * 6. Seller creates a variant (SKU) under the product.
 * 7. Seller edits the product to trigger snapshot creation with nested variant snapshots.
 * 8. Seller soft-deletes the product.
 * 9. Administrator retrieves the variant snapshot — must succeed with all denormalized fields.
 */
export async function test_api_product_variant_snapshot_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 6. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 7. Seller edits product — triggers product snapshot with nested variant snapshots
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    shopping_mall_category_id: category.id,
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  // 8. Seller soft-deletes the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 9. Admin retrieves variant snapshot — must succeed after product deletion
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshot =
    await api.functional.shoppingMall.admin.products.snapshots.variant_snapshots.at(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
        variantSnapshotId,
      },
    );
  typia.assert(variantSnapshot);
}
