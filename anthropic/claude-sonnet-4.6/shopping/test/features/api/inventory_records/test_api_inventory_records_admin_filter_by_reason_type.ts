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

export async function test_api_inventory_records_admin_filter_by_reason_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create seller connection and join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller
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
  // 6. Seller creates a product with the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Seller creates a variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 8. Seller creates a manual_restock inventory record (positive quantity)
  const restockRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: 50,
          note: "Initial stock delivery",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(restockRecord);
  // 9. Seller creates a manual_adjustment inventory record (negative quantity)
  const adjustmentRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: -5,
          note: "Damaged goods correction",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(adjustmentRecord);
  // 10. Admin filters inventory records by manual_restock
  const restockFiltered =
    await api.functional.shoppingMall.admin.variants.inventoryRecords.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          reasonTypes: ["manual_restock"],
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockFiltered);
  // Assert: all returned records have reasonType = 'manual_restock'
  TestValidator.predicate(
    "all restock records have reasonType manual_restock",
    restockFiltered.data.every((r) => r.reasonType === "manual_restock"),
  );
  // Assert: no manual_adjustment records in the result
  TestValidator.predicate(
    "no manual_adjustment in restock filter result",
    restockFiltered.data.every((r) => r.reasonType !== "manual_adjustment"),
  );
  // Assert: each restock record has positive quantity and non-null note
  TestValidator.predicate(
    "restock records have positive quantity",
    restockFiltered.data.every((r) => r.quantity > 0),
  );
  TestValidator.predicate(
    "restock records have non-null note",
    restockFiltered.data.every((r) => r.note !== null),
  );
  // Assert: pagination reflects only matching count
  TestValidator.predicate(
    "restock filter pagination records matches data length",
    restockFiltered.pagination.records === restockFiltered.data.length,
  );
  // 11. Admin filters inventory records by manual_adjustment
  const adjustmentFiltered =
    await api.functional.shoppingMall.admin.variants.inventoryRecords.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          reasonTypes: ["manual_adjustment"],
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(adjustmentFiltered);
  // Assert: all returned records have reasonType = 'manual_adjustment'
  TestValidator.predicate(
    "all adjustment records have reasonType manual_adjustment",
    adjustmentFiltered.data.every((r) => r.reasonType === "manual_adjustment"),
  );
  // Assert: each adjustment record has negative quantity
  TestValidator.predicate(
    "adjustment records have negative quantity",
    adjustmentFiltered.data.every((r) => r.quantity < 0),
  );
  // Assert: no manual_restock records in the adjustment filter result
  TestValidator.predicate(
    "no manual_restock in adjustment filter result",
    adjustmentFiltered.data.every((r) => r.reasonType !== "manual_restock"),
  );
  // Assert: pagination reflects only matching count
  TestValidator.predicate(
    "adjustment filter pagination records matches data length",
    adjustmentFiltered.pagination.records === adjustmentFiltered.data.length,
  );
}
