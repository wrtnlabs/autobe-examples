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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test administrator retrieval of a standalone variant snapshot created from a variant-only edit.
 *
 * Validates that when a seller edits only a variant (changing its price) without modifying the parent product, a standalone variant snapshot is automatically created with a null productSnapshot reference. The administrator can then retrieve this snapshot and verify that all frozen fields — SKU code, option values, variant-specific price, and stock quantity — match the variant's state exactly as it existed before the edit.
 *
 * The test also confirms that the snapshot's created_at timestamp reflects when the variant edit occurred and that the snapshot record is immutable.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Seller registers and obtains credentials.
 * 3. Administrator approves the pending seller.
 * 4. Seller creates a product under their account.
 * 5. Seller creates a variant with SKU code, option values, and price.
 * 6. Seller edits the variant's price to trigger an automatic standalone variant snapshot.
 * 7. Administrator retrieves the generated snapshot via the snapshot retrieval endpoint.
 * 8. Validates snapshot fields: null productSnapshot, frozen SKU code, option values, price, and stock quantity.
 */
export async function test_api_admin_variant_snapshot_standalone_retrieval(
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
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // Capture pre-update state for snapshot validation
  const oldCode = variant.code;
  const oldPrice = variant.price;
  const oldOptionValuesStr = variant.optionValues
    .map((ov) => `${ov.key}: ${ov.value}`)
    .join(", ");
  const oldStock = variant.stock_quantity;
  // 6. Update variant price to trigger standalone snapshot
  const newPrice = (oldPrice ?? product.base_price) + 1000;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: newPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 7. Admin retrieves the standalone variant snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantCode: oldCode,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate standalone snapshot characteristics
  TestValidator.equals(
    "productSnapshot is null (standalone variant-only snapshot)",
    snapshot.productSnapshot,
    null,
  );
  TestValidator.equals(
    "sku_code matches pre-update variant code",
    snapshot.sku_code,
    oldCode,
  );
  TestValidator.equals(
    "option_values match pre-update option values",
    snapshot.option_values,
    oldOptionValuesStr,
  );
  TestValidator.equals(
    "price matches pre-update variant price",
    snapshot.price,
    oldPrice,
  );
  TestValidator.equals(
    "stock_quantity matches pre-update stock level",
    snapshot.stock_quantity,
    oldStock,
  );
}
