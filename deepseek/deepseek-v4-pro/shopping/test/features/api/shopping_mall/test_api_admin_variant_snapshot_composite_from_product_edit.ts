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
 * Test retrieval of a variant snapshot created as a child of a composite product-variant snapshot.
 *
 * Validates that when a seller edits a product, the resulting product snapshot automatically nests variant snapshots for all variants at that moment. The administrator then retrieves one of these nested variant snapshots and verifies that the productSnapshot reference is non-null, correctly linking back to the parent product snapshot, and that the frozen SKU code, option values, price, and stock quantity reflect the variant's state at the exact moment of the product edit.
 *
 * This test ensures the full product-variant hierarchy can be reconstructed at any historical point using snapshot data alone, without relying on the current state of the live product or variant records.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Seller registers with known credentials and gets approved by the administrator.
 * 3. Seller creates a product with a category and base price.
 * 4. Seller adds a variant with SKU code and option values.
 * 5. Seller edits the product, triggering a composite snapshot that captures product state and all variant states.
 * 6. Administrator retrieves one nested variant snapshot by its ID.
 * 7. Validates productSnapshot is non-null and all frozen fields match the variant's pre-edit state.
 */
export async function test_api_admin_variant_snapshot_composite_from_product_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration with known credentials for re-login after approval
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  // 3. Administrator approves the pending seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // 4. Seller re-authenticates for fresh tokens after approval
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // 6. Seller creates a variant under the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  // 7. Seller edits the product — triggers composite snapshot with nested variant snapshots
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        shopping_mall_category_id: product.category.id,
        base_price: product.base_price + 1000,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 8. Administrator retrieves one of the nested variant snapshots
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshot: IShoppingMallProductVariantSnapshot =
    await api.functional.shoppingMall.admin.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantCode: variant.code,
        snapshotId,
      },
    );
  typia.assert(variantSnapshot);
  // 9. Validate composite snapshot structure and frozen variant state
  TestValidator.predicate(
    "productSnapshot reference is non-null for composite product-variant snapshot",
    variantSnapshot.productSnapshot !== null,
  );
  TestValidator.equals(
    "frozen SKU code matches variant code at edit time",
    variantSnapshot.sku_code,
    variant.code,
  );
  const expectedOptionValues = variant.optionValues
    .map((ov) => `${ov.key}: ${ov.value}`)
    .join(", ");
  TestValidator.equals(
    "frozen option values match variant at edit time",
    variantSnapshot.option_values,
    expectedOptionValues,
  );
  TestValidator.equals(
    "frozen price matches variant price at edit time",
    variantSnapshot.price,
    variant.price,
  );
  TestValidator.predicate(
    "frozen stock quantity is a valid non-negative integer",
    variantSnapshot.stock_quantity >= 0,
  );
}
