import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSkus";
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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_snapshot_skus_filtered_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphaNumeric(8) } },
  );
  typia.assert(category);
  // 3. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller
  const approvalResult =
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
  typia.assert(approvalResult);
  // Generate unique suffix to avoid SKU collision across test runs
  const suffix = RandomGenerator.alphaNumeric(6).toUpperCase();
  const skuAlpha001 = `ALPHA-001-${suffix}`;
  const skuAlpha002 = `ALPHA-002-${suffix}`;
  const skuBeta001 = `BETA-001-${suffix}`;
  // 6. Seller creates a product with 3 variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 100,
        categoryId: category.id,
        variants: [
          {
            sku: skuAlpha001,
            priceOverride: 50,
            options: [
              { key: "color", value: "red", sequence: 0 },
              { key: "size", value: "S", sequence: 1 },
            ],
          },
          {
            sku: skuAlpha002,
            priceOverride: 80,
            options: [
              { key: "color", value: "blue", sequence: 0 },
              { key: "size", value: "M", sequence: 1 },
            ],
          },
          {
            sku: skuBeta001,
            priceOverride: 120,
            options: [
              { key: "color", value: "red", sequence: 0 },
              { key: "size", value: "L", sequence: 1 },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 7. Retrieve snapshot list to get snapshot ID
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate("snapshot exists", snapshotPage.data.length > 0);
  const snapshotId = snapshotPage.data[0]!.id;
  // Sub-case A: SKU code partial match - "ALPHA" should return Variant A & B
  const resultA =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          skuCode: "ALPHA",
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(resultA);
  TestValidator.equals(
    "sub-case A: records count",
    resultA.pagination.records,
    2,
  );
  TestValidator.equals("sub-case A: data length", resultA.data.length, 2);
  // Sub-case B: price range filter - 60..100 should return only Variant B (price 80)
  const resultB =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          minPrice: 60,
          maxPrice: 100,
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(resultB);
  TestValidator.equals(
    "sub-case B: records count",
    resultB.pagination.records,
    1,
  );
  TestValidator.equals("sub-case B: data length", resultB.data.length, 1);
  TestValidator.equals(
    "sub-case B: price matches 80",
    resultB.data[0]!.price,
    80,
  );
  // Sub-case C: option key-value filter - color=red should return Variant A & C
  const resultC =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          optionFilters: [
            {
              key: "color",
              value: "red",
            } satisfies IShoppingMallProductSnapshotSkusOption.IRequest,
          ],
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(resultC);
  TestValidator.equals(
    "sub-case C: records count",
    resultC.pagination.records,
    2,
  );
  TestValidator.equals("sub-case C: data length", resultC.data.length, 2);
  // Sub-case D: nonexistent SKU code - should return empty result without error
  const resultD =
    await api.functional.shoppingMall.seller.products.snapshots.skuses.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId,
        body: {
          skuCode: "NONEXISTENT",
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(resultD);
  TestValidator.equals(
    "sub-case D: records count",
    resultD.pagination.records,
    0,
  );
  TestValidator.equals("sub-case D: data length", resultD.data.length, 0);
}
