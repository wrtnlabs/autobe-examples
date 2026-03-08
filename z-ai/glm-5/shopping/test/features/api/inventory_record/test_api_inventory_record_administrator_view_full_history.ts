import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_administrator_view_full_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with a variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Seller creates first inventory record (positive - restock)
  const firstRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock from supplier",
        },
      },
    );
  typia.assert(firstRecord);
  // Seller creates second inventory record (negative - adjustment)
  const secondRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: -10,
          reason: "Damaged goods removed from warehouse",
        },
      },
    );
  typia.assert(secondRecord);
  // 5. Administrator queries inventory history
  const history =
    await api.functional.shoppingMall.administrator.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        },
      },
    );
  typia.assert(history);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    () => history.pagination !== undefined,
  );
  TestValidator.equals("current page", history.pagination.current, 1);
  TestValidator.equals("limit", history.pagination.limit, 20);
  TestValidator.predicate(
    "total records count",
    () => history.pagination.records >= 2,
  );
  TestValidator.predicate("total pages", () => history.pagination.pages >= 1);
  // Validate records exist
  TestValidator.predicate(
    "has inventory records",
    () => history.data.length >= 2,
  );
  // Validate records are sorted by created_at descending (newest first)
  for (let i = 0; i < history.data.length - 1; i++) {
    const current = new Date(history.data[i].createdAt).getTime();
    const next = new Date(history.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `records sorted descending at index ${i}`,
      () => current >= next,
    );
  }
  // Find the created records in the response
  const foundFirstRecord = history.data.find((r) => r.id === firstRecord.id);
  const foundSecondRecord = history.data.find((r) => r.id === secondRecord.id);
  TestValidator.predicate(
    "first record found",
    () => foundFirstRecord !== undefined,
  );
  TestValidator.predicate(
    "second record found",
    () => foundSecondRecord !== undefined,
  );
  // Validate first record (positive quantity change)
  TestValidator.equals(
    "first record quantity change",
    foundFirstRecord!.quantityChange,
    100,
  );
  TestValidator.equals(
    "first record reason",
    foundFirstRecord!.reason,
    "Initial stock from supplier",
  );
  TestValidator.predicate(
    "first record has variant",
    () => foundFirstRecord!.variant !== null,
  );
  TestValidator.equals(
    "first record variant SKU",
    foundFirstRecord!.variant.sku_code,
    variant.skuCode,
  );
  TestValidator.predicate(
    "first record has seller reference",
    () => foundFirstRecord!.seller !== null,
  );
  TestValidator.equals(
    "first record seller matches",
    foundFirstRecord!.seller!.id,
    sellerAuth.id,
  );
  // Validate second record (negative quantity change)
  TestValidator.equals(
    "second record quantity change",
    foundSecondRecord!.quantityChange,
    -10,
  );
  TestValidator.equals(
    "second record reason",
    foundSecondRecord!.reason,
    "Damaged goods removed from warehouse",
  );
  TestValidator.predicate(
    "second record has variant",
    () => foundSecondRecord!.variant !== null,
  );
  TestValidator.predicate(
    "second record has seller reference",
    () => foundSecondRecord!.seller !== null,
  );
  // Validate that automatic record references are null for manual entries
  TestValidator.equals(
    "first record has no order reference",
    foundFirstRecord!.order,
    null,
  );
  TestValidator.equals(
    "first record has no cancellation request",
    foundFirstRecord!.cancellationRequest,
    null,
  );
  TestValidator.equals(
    "first record has no refund request",
    foundFirstRecord!.refundRequest,
    null,
  );
}
