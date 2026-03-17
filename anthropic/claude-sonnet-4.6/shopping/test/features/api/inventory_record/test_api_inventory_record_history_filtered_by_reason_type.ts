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

export async function test_api_inventory_record_history_filtered_by_reason_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
  );
  typia.assert(category);
  // 3. Seller joins
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
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller
  const updatedApproval =
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
  typia.assert(updatedApproval);
  // 6. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
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
        body: {
          sku: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          options: [{ key: "color", value: "red", sequence: 0 }],
        },
      },
    );
  typia.assert(variant);
  // Record timestamps for date range test
  const beforeAnyRecord = new Date(Date.now() - 1000).toISOString();
  // 8. Create first manual_restock record (positive quantity)
  const record1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 50,
          note: "First restock - received new shipment from supplier",
        },
      },
    );
  typia.assert(record1);
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const midTimestamp = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 9. Create second manual_restock record (positive quantity)
  const record2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 30,
          note: "Second restock - additional shipment received",
        },
      },
    );
  typia.assert(record2);
  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 10. Create one manual_adjustment record (negative quantity)
  const record3 =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: -10,
          note: "Adjustment - damaged goods removed from warehouse",
        },
      },
    );
  typia.assert(record3);
  const afterAllRecords = new Date(Date.now() + 1000).toISOString();
  // ========== Part A: Filter by reasonTypes ==========
  const filteredByReasonType =
    await api.functional.shoppingMall.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reasonTypes: ["manual_restock"],
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredByReasonType);
  // All records must have reasonType === 'manual_restock'
  TestValidator.predicate(
    "all records have manual_restock reasonType",
    filteredByReasonType.data.every((r) => r.reasonType === "manual_restock"),
  );
  // Count should be exactly 2
  TestValidator.equals(
    "manual_restock records count",
    filteredByReasonType.pagination.records,
    2,
  );
  // Each record should have non-null note
  TestValidator.predicate(
    "each manual_restock record has non-null note",
    filteredByReasonType.data.every((r) => r.note !== null),
  );
  // ========== Part B: Sort in descending order ==========
  const sortedDescending =
    await api.functional.shoppingMall.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sort: "desc",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sortedDescending);
  // All 3 records returned
  TestValidator.equals(
    "total records count is 3",
    sortedDescending.pagination.records,
    3,
  );
  // Records ordered descending (most recent first): record3 > record2 > record1
  TestValidator.predicate(
    "records are sorted descending by createdAt",
    sortedDescending.data.length >= 2 &&
      sortedDescending.data.every((r, idx) => {
        if (idx === 0) return true;
        const prev = sortedDescending.data[idx - 1]!;
        return new Date(r.createdAt) <= new Date(prev.createdAt);
      }),
  );
  // Most recently created record (record3, the adjustment) appears at index 0
  TestValidator.equals(
    "most recent record is first in desc order",
    sortedDescending.data[0]!.id,
    record3.id,
  );
  // ========== Part C: Date range filter ==========
  // dateFrom = before any record, dateTo = midTimestamp (between record1 and record2)
  const dateRangeFiltered =
    await api.functional.shoppingMall.seller.products.variants.inventoryRecords.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          dateFrom: beforeAnyRecord,
          dateTo: midTimestamp,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  // Only records created within the specified date range should be returned
  // record1 was created before midTimestamp, record2 and record3 were after
  TestValidator.predicate(
    "date range filtered records count is 1",
    dateRangeFiltered.pagination.records === 1,
  );
  // The returned record should be record1
  TestValidator.equals(
    "date range filtered result contains only record1",
    dateRangeFiltered.data[0]!.id,
    record1.id,
  );
}
