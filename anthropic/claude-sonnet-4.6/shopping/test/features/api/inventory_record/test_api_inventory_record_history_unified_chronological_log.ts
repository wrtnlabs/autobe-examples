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

export async function test_api_inventory_record_history_unified_chronological_log(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 5. Admin approves seller
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
  // Re-login seller after approval to ensure fresh session with approved status
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 6. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection2,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection2,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 8. Seller creates manual restock record (positive quantity)
  const restockQty = 50;
  const restockRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection2,
      {
        body: {
          quantity: restockQty,
          note: "Received new shipment from supplier",
        },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(restockRecord);
  // 9. Seller creates manual adjustment record (negative quantity, must not exceed current stock)
  const adjustmentQty = -10;
  const adjustmentRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection2,
      {
        body: {
          quantity: adjustmentQty,
          note: "Damaged goods removed from warehouse",
        },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(adjustmentRecord);
  // --- Target Operation: Retrieve full inventory history ---
  const history =
    await api.functional.shoppingMall.seller.products.variants.inventoryRecords.index(
      sellerConnection2,
      {
        productId: product.id,
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(history);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", history.pagination.current, 1);
  TestValidator.predicate("limit is at least 1", history.pagination.limit >= 1);
  TestValidator.predicate(
    "total records >= 2",
    history.pagination.records >= 2,
  );
  TestValidator.predicate(
    "data array has at least 2 records",
    history.data.length >= 2,
  );
  // All records belong to the correct variant
  for (const record of history.data) {
    TestValidator.equals(
      "record variantId matches",
      record.variantId,
      variant.id,
    );
  }
  // Records are ordered ascending by createdAt (oldest first)
  for (let i = 1; i < history.data.length; i++) {
    TestValidator.predicate(
      "records are in ascending chronological order",
      history.data[i - 1]!.createdAt <= history.data[i]!.createdAt,
    );
  }
  // Find the restock and adjustment records
  const restockFound = history.data.find((r) => r.id === restockRecord.id);
  const adjustmentFound = history.data.find(
    (r) => r.id === adjustmentRecord.id,
  );
  TestValidator.predicate(
    "restock record found in history",
    restockFound !== undefined,
  );
  TestValidator.predicate(
    "adjustment record found in history",
    adjustmentFound !== undefined,
  );
  // Validate restock record properties
  if (restockFound !== undefined) {
    TestValidator.predicate(
      "restock quantity is positive",
      restockFound.quantity > 0,
    );
    TestValidator.equals(
      "restock reasonType is manual_restock",
      restockFound.reasonType,
      "manual_restock",
    );
    TestValidator.predicate(
      "restock note is non-null",
      restockFound.note !== null,
    );
  }
  // Validate adjustment record properties
  if (adjustmentFound !== undefined) {
    TestValidator.predicate(
      "adjustment quantity is negative",
      adjustmentFound.quantity < 0,
    );
    TestValidator.equals(
      "adjustment reasonType is manual_adjustment",
      adjustmentFound.reasonType,
      "manual_adjustment",
    );
    TestValidator.predicate(
      "adjustment note is non-null",
      adjustmentFound.note !== null,
    );
  }
  // Validate sum of all quantities equals current stock level (restock + adjustment)
  const totalQuantity = history.data.reduce((sum, r) => sum + r.quantity, 0);
  TestValidator.equals(
    "sum of quantities equals expected stock level",
    totalQuantity,
    restockQty + adjustmentQty,
  );
}
