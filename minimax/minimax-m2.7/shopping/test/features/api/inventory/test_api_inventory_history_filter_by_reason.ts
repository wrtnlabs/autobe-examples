import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test filtering inventory history records by specific reason type.
 *
 * Validates the inventory history filtering functionality by creating a product variant with multiple inventory records having different reasons (restock, order_placement, adjustment), then filtering by 'restock' reason only.
 *
 * **Setup Flow**:
 * 1. Register and authenticate as a seller using utility function
 * 2. Create a test product with name and description
 * 3. Create a product variant with SKU code and option values
 * 4. Add four inventory records with different reasons:
 *    - Two 'restock' records with positive quantity
 *    - One 'order_placement' record with negative quantity
 *    - One 'adjustment' record with negative quantity
 *
 * **Test Execution**:
 * Call the PATCH /ecommerceMall/seller/sellers/me/variants/{variantId}/inventory/history endpoint with reason filter set to 'restock'.
 *
 * **Validation Points**:
 * - Response status is 200 OK with paginated results
 * - All returned records have reason = 'restock'
 * - Records with other reasons ('order_placement', 'adjustment') are excluded from results
 * - Pagination metadata shows only restock records in total count
 * - Records are sorted by created_at in descending order (most recent first)
 * - Each record includes the variant summary with correct SKU code
 *
 * 1. Seller registers with unique email and credentials.
 * 2. Product is created with valid name, description, and category.
 * 3. Variant is created with unique SKU and color option.
 * 4. First restock inventory record is added (positive quantity).
 * 5. Second restock inventory record is added (positive quantity).
 * 6. Order placement record is added (negative quantity).
 * 7. Adjustment record is added (negative quantity).
 * 8. Inventory history is queried with reason='restock' filter.
 * 9. Validates only restock records are returned.
 * 10. Validates correct record count and ordering.
 */
export async function test_api_inventory_history_filter_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create a product variant
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add first restock inventory record
  const restockRecord1: IEcommerceMallInventoryRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "restock",
        },
        params: { variantId: variant.id },
      },
    );
  typia.assert(restockRecord1);
  TestValidator.equals(
    "restock record 1 reason",
    restockRecord1.reason,
    "restock",
  );
  // 5. Add second restock inventory record
  const restockRecord2: IEcommerceMallInventoryRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "restock",
        },
        params: { variantId: variant.id },
      },
    );
  typia.assert(restockRecord2);
  TestValidator.equals(
    "restock record 2 reason",
    restockRecord2.reason,
    "restock",
  );
  // 6. Add order_placement inventory record
  const orderRecord: IEcommerceMallInventoryRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        body: {
          quantityChange: -typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "order_placement",
        },
        params: { variantId: variant.id },
      },
    );
  typia.assert(orderRecord);
  TestValidator.equals(
    "order record reason",
    orderRecord.reason,
    "order_placement",
  );
  // 7. Add adjustment inventory record
  const adjustmentRecord: IEcommerceMallInventoryRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        body: {
          quantityChange: -typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "adjustment",
        },
        params: { variantId: variant.id },
      },
    );
  typia.assert(adjustmentRecord);
  TestValidator.equals(
    "adjustment record reason",
    adjustmentRecord.reason,
    "adjustment",
  );
  // 8. Call inventory history with reason='restock' filter
  const historyResponse: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.history.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          reason: "restock",
        },
      },
    );
  typia.assert(historyResponse);
  // 9. Validate only restock records are returned
  TestValidator.predicate("response has data", historyResponse.data.length > 0);
  TestValidator.equals(
    "data count is 2 (only restock records)",
    historyResponse.data.length,
    2,
  );
  // Validate all returned records have reason = 'restock'
  for (const record of historyResponse.data) {
    TestValidator.equals(
      `record ${record.id} has reason 'restock'`,
      record.reason,
      "restock",
    );
  }
  // Validate pagination total reflects only restock records
  TestValidator.equals(
    "pagination records count",
    historyResponse.pagination.records,
    2,
  );
  // 10. Validate records are sorted by created_at descending
  for (let i = 0; i < historyResponse.data.length - 1; i++) {
    const current = new Date(historyResponse.data[i].created_at).getTime();
    const next = new Date(historyResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `record ${i} created_at >= record ${i + 1} created_at`,
      current >= next,
    );
  }
  // Validate variant summary is included in each record
  for (const record of historyResponse.data) {
    TestValidator.equals("variant id matches", record.variant.id, variant.id);
    TestValidator.equals(
      "variant sku code matches",
      record.variant.skuCode,
      variant.skuCode,
    );
  }
}
