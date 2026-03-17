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

export async function test_api_snapshot_skus_admin_filter_by_sku_code_and_price_range(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin setup ───────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── 2. Admin creates category ────────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // ─── 3. Seller setup ──────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // ─── 4. Seller submits approval request ───────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ─── 5. Admin approves the seller ─────────────────────────────────
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
  // ─── 6. Seller creates product with 3 distinguishable variants ────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        variants: [
          {
            sku: "ALPHA-001",
            priceOverride: 10.0,
            options: [{ key: "color", value: "red", sequence: 0 }],
          },
          {
            sku: "ALPHA-002",
            priceOverride: 20.0,
            options: [{ key: "color", value: "blue", sequence: 0 }],
          },
          {
            sku: "BETA-001",
            priceOverride: 30.0,
            options: [{ key: "color", value: "green", sequence: 0 }],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // ─── 7. Admin retrieves snapshot list to obtain snapshotId ────────
  const snapshotPage =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: product.seller.id,
        productId: product.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshot list has at least one entry",
    snapshotPage.data.length > 0,
  );
  const snapshotId = snapshotPage.data[0]!.id;
  // ─── Filter Test 1: SKU code partial match 'ALPHA' ────────────────
  const filterBySkuCode =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId,
        body: {
          skuCode: "ALPHA",
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(filterBySkuCode);
  TestValidator.equals(
    "ALPHA SKU filter returns 2 records",
    filterBySkuCode.pagination.records,
    2,
  );
  TestValidator.predicate("all returned SKU codes contain ALPHA", () =>
    filterBySkuCode.data.every((sku) => sku.skuCode.includes("ALPHA")),
  );
  // ─── Filter Test 2: price range 15–25 ─────────────────────────────
  const filterByPriceRange =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId,
        body: {
          minPrice: 15,
          maxPrice: 25,
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(filterByPriceRange);
  TestValidator.equals(
    "price range 15-25 filter returns 1 record",
    filterByPriceRange.pagination.records,
    1,
  );
  TestValidator.predicate("returned SKU price is within range 15-25", () =>
    filterByPriceRange.data.every((sku) => sku.price >= 15 && sku.price <= 25),
  );
  // ─── Filter Test 3: option key-value filter color=red ─────────────
  const filterByOption =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId,
        body: {
          optionFilters: [{ key: "color", value: "red" }],
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(filterByOption);
  TestValidator.equals(
    "option filter color=red returns 1 record",
    filterByOption.pagination.records,
    1,
  );
  TestValidator.equals(
    "option filter color=red returns ALPHA-001",
    filterByOption.data[0]!.skuCode,
    "ALPHA-001",
  );
  // ─── Filter Test 4: combined skuCode='ALPHA' + minPrice=15 ────────
  const filterCombined =
    await api.functional.shoppingMall.admin.snapshots.skuses.index(
      adminConnection,
      {
        snapshotId,
        body: {
          skuCode: "ALPHA",
          minPrice: 15,
        } satisfies IShoppingMallProductSnapshotSkus.IRequest,
      },
    );
  typia.assert(filterCombined);
  TestValidator.equals(
    "combined ALPHA + minPrice=15 filter returns 1 record",
    filterCombined.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter returns ALPHA-002",
    filterCombined.data[0]!.skuCode,
    "ALPHA-002",
  );
}
