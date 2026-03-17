import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_inventory_records_admin_view_full_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category as admin
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup - join as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Submit seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 5. Admin approves the seller registration
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
  // 6. Create a product as the approved seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Add a variant to the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 8. Create a large manual_restock record (positive quantity)
  const restockRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: 100,
          note: "Initial stock from supplier shipment",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(restockRecord);
  // 9. Create a manual_adjustment record (negative quantity)
  const adjustmentRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: -10,
          note: "Damaged goods removed from warehouse",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(adjustmentRecord);
  // 10. As admin, retrieve the full inventory history with no filters
  const historyPage =
    await api.functional.shoppingMall.admin.variants.inventoryRecords.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {} satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(historyPage);
  // Assertions on pagination metadata
  TestValidator.predicate(
    "records count >= 2",
    historyPage.pagination.records >= 2,
  );
  TestValidator.predicate(
    "data array has at least 2 items",
    historyPage.data.length >= 2,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    historyPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    historyPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    historyPage.pagination.pages >= 1,
  );
  // Find the restock record in the returned data
  const foundRestock = historyPage.data.find((r) => r.id === restockRecord.id);
  TestValidator.predicate("restock record found", foundRestock !== undefined);
  if (foundRestock !== undefined) {
    TestValidator.predicate(
      "restock quantity is positive",
      foundRestock.quantity > 0,
    );
    TestValidator.equals(
      "restock reasonType is manual_restock",
      foundRestock.reasonType,
      "manual_restock",
    );
    TestValidator.predicate(
      "restock note is non-null",
      foundRestock.note !== null,
    );
  }
  // Find the adjustment record in the returned data
  const foundAdjustment = historyPage.data.find(
    (r) => r.id === adjustmentRecord.id,
  );
  TestValidator.predicate(
    "adjustment record found",
    foundAdjustment !== undefined,
  );
  if (foundAdjustment !== undefined) {
    TestValidator.predicate(
      "adjustment quantity is negative",
      foundAdjustment.quantity < 0,
    );
    TestValidator.equals(
      "adjustment reasonType is manual_adjustment",
      foundAdjustment.reasonType,
      "manual_adjustment",
    );
    TestValidator.predicate(
      "adjustment note is non-null",
      foundAdjustment.note !== null,
    );
  }
}
