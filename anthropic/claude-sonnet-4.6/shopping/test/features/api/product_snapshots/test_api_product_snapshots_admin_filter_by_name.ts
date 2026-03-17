import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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

export async function test_api_product_snapshots_admin_filter_by_name(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register admin ──────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ── Step 2: Create a product category ──────────────────────────────────
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics " + RandomGenerator.alphaNumeric(6),
        description: "Electronic devices and accessories",
      },
    },
  );
  typia.assert(category);
  // ── Step 3: Register a seller ───────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ── Step 4: Submit seller approval request ──────────────────────────────
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ── Step 5: Admin approves the seller ──────────────────────────────────
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
  // ── Step 6: Seller creates a product with a 'Wireless' name ─────────────
  const firstProductName = "Premium Wireless Headphones";
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: firstProductName,
        description: "High quality wireless headphones with noise cancellation",
        base_price: 199.99,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  const sellerId = product.seller.id;
  const productId = product.id;
  // ── Step 7: Seller updates product name to generate a second snapshot ───
  const secondProductName = "Budget Earphones";
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: productId,
      body: {
        name: secondProductName,
        description: "Affordable earphones for everyday use",
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // ── Step 8: Fetch snapshots filtered by 'Wireless' keyword ─────────────
  const filteredResult =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        productId: productId,
        body: {
          name: "Wireless",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Validate: only Wireless snapshots are returned
  TestValidator.predicate(
    "filtered data contains only Wireless snapshots",
    filteredResult.data.every((snapshot) =>
      snapshot.name.toLowerCase().includes("wireless"),
    ),
  );
  // Validate: Budget Earphones snapshot NOT in filtered result
  TestValidator.predicate(
    "Budget Earphones snapshot not in filtered result",
    filteredResult.data.every(
      (snapshot) => !snapshot.name.toLowerCase().includes("budget"),
    ),
  );
  // Validate: pagination records matches filtered count (should be 1)
  TestValidator.predicate(
    "pagination records reflects only matching snapshot count",
    filteredResult.pagination.records === filteredResult.data.length,
  );
  // Validate: at least 1 snapshot matches (the first one with 'Wireless')
  TestValidator.predicate(
    "at least one snapshot returned for Wireless filter",
    filteredResult.data.length >= 1,
  );
  // ── Step 9: Control test — no name filter returns both snapshots ─────────
  const unfiltered =
    await api.functional.shoppingMall.admin.sellers.products.snapshots.index(
      adminConnection,
      {
        sellerId: sellerId,
        productId: productId,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(unfiltered);
  // Control: both snapshots should be present when no filter is applied
  TestValidator.predicate(
    "unfiltered result has both snapshots (records >= 2)",
    unfiltered.pagination.records >= 2,
  );
  // Validate: the filtered count is less than the unfiltered count
  TestValidator.predicate(
    "filtered count is less than unfiltered count",
    filteredResult.pagination.records < unfiltered.pagination.records,
  );
}
