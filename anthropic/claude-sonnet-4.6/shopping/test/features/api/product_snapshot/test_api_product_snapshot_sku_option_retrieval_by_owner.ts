import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkus";
import type { IPageIShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_snapshot_sku_option_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Step 3: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 4: Submit seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // Step 5: Admin approves the seller
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // Step 6: Create a product with the categoryId
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // Step 7: Add a variant with specific option key-value pairs
  const colorKey = "color";
  const colorValue = "red";
  const sizeKey = "size";
  const sizeValue = "XL";
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: [
            {
              key: colorKey,
              value: colorValue,
              sequence: 0,
            },
            {
              key: sizeKey,
              value: sizeValue,
              sequence: 1,
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // Step 8: Retrieve snapshot list
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotPage.data.length > 0,
  );
  const snapshot = snapshotPage.data[0]!;
  const snapshotId = snapshot.id;
  // Step 9: Retrieve snapshot SKU list
  const skuPage =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {} satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(skuPage);
  TestValidator.predicate("at least one SKU exists", skuPage.data.length > 0);
  const sku = skuPage.data[0]!;
  const skuId = sku.id;
  // Step 10: Retrieve snapshot SKU option list
  const optionPage =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
        body: {} satisfies IShoppingMallProductSnapshotSkusOption.IRequest,
      },
    );
  typia.assert(optionPage);
  TestValidator.predicate(
    "at least one option exists",
    optionPage.data.length > 0,
  );
  const option = optionPage.data[0]!;
  const optionId = option.id;
  // Step 11: Retrieve the specific option by ID (the main target endpoint)
  const retrievedOption =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
        optionId: optionId,
      },
    );
  typia.assert(retrievedOption);
  // Validations
  TestValidator.equals("option id matches", retrievedOption.id, optionId);
  TestValidator.equals(
    "product_snapshot_skus_id matches skuId",
    retrievedOption.product_snapshot_skus_id,
    skuId,
  );
  TestValidator.predicate(
    "sequence is non-negative",
    retrievedOption.sequence >= 0,
  );
  // Verify immutability: call endpoint a second time and expect same data
  const retrievedOptionAgain =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.options.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        skuId: skuId,
        optionId: optionId,
      },
    );
  typia.assert(retrievedOptionAgain);
  TestValidator.equals(
    "immutable id on second call",
    retrievedOptionAgain.id,
    retrievedOption.id,
  );
  TestValidator.equals(
    "immutable key on second call",
    retrievedOptionAgain.key,
    retrievedOption.key,
  );
  TestValidator.equals(
    "immutable value on second call",
    retrievedOptionAgain.value,
    retrievedOption.value,
  );
  TestValidator.equals(
    "immutable sequence on second call",
    retrievedOptionAgain.sequence,
    retrievedOption.sequence,
  );
}
