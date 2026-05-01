import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
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
 * Test variant snapshot filtering by option values through the admin endpoint.
 *
 * Validates that the administrator can list variant snapshots within a product
 * snapshot and filter them using the option_values parameter with partial,
 * case-insensitive matching. Two variants with distinguishable option value
 * combinations are created before a product edit triggers automatic snapshot
 * generation.
 *
 * The test confirms that the option_values filter operates on the denormalized
 * historical option values captured in the snapshot, not the live variant's
 * current values. Case-insensitive matching ensures that both "Red" and "red"
 * return the same results.
 *
 * 1. Administrator registers and authenticates for admin-protected endpoints.
 * 2. Seller registers and creates a product with two variants.
 * 3. Variant 1 has option values "color: Red, size: Large".
 * 4. Variant 2 has option values "color: Blue, size: Medium".
 * 5. Seller edits the product to trigger automatic snapshot creation capturing
 *    both variant states.
 * 6. Administrator retrieves the product snapshot list to obtain the snapshotId.
 * 7. Administrator queries variant snapshots with option_values filter "Red".
 * 8. Validates only the Red variant snapshot is returned, Blue is excluded.
 * 9. Validates case-insensitive matching by querying with "red" and confirming
 *    the same single result.
 */
export async function test_api_variant_snapshot_admin_list_filter_by_option_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Create variant 1 with option values "color: Red, size: Large"
  const variantRed =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variantRed);
  // 5. Create variant 2 with option values "color: Blue, size: Medium"
  const variantBlue =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variantBlue);
  // 6. Edit product to trigger automatic snapshot creation capturing both variants
  await api.functional.shoppingMall.seller.products.update(sellerConnection, {
    productId: product.id,
    body: {
      name: product.name,
      description: product.description,
      shopping_mall_category_id: product.category.id,
      base_price: product.base_price + 100,
    } satisfies IShoppingMallProduct.IUpdate,
  });
  // 7. Administrator retrieves product snapshots to obtain the snapshotId
  const snapshots =
    await api.functional.shoppingMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  const snapshotId = snapshots.data[0].id;
  // 8. Query variant snapshots with option_values filter "Red"
  const filteredByRed =
    await api.functional.shoppingMall.admin.products.snapshots.variant_snapshots.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          option_values: "Red",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRed);
  // 9. Validate only the Red variant snapshot is returned
  TestValidator.equals("red filter count", filteredByRed.data.length, 1);
  TestValidator.predicate(
    "snapshot option_values contains Red",
    filteredByRed.data[0].option_values.includes("Red"),
  );
  TestValidator.predicate(
    "snapshot option_values excludes Blue",
    !filteredByRed.data[0].option_values.includes("Blue"),
  );
  // 10. Validate case-insensitive partial matching with lowercase "red"
  const filteredByRedLower =
    await api.functional.shoppingMall.admin.products.snapshots.variant_snapshots.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          option_values: "red",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRedLower);
  TestValidator.equals(
    "case-insensitive filter count",
    filteredByRedLower.data.length,
    1,
  );
  TestValidator.predicate(
    "case-insensitive match contains Red in option_values",
    filteredByRedLower.data[0].option_values.toLowerCase().includes("red"),
  );
  // 11. Validate that filtering by "Blue" excludes Red variant
  const filteredByBlue =
    await api.functional.shoppingMall.admin.products.snapshots.variant_snapshots.index(
      adminConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          option_values: "Blue",
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(filteredByBlue);
  TestValidator.equals("blue filter count", filteredByBlue.data.length, 1);
  TestValidator.predicate(
    "blue filter snapshot excludes Red",
    !filteredByBlue.data[0].option_values.includes("Red"),
  );
}
