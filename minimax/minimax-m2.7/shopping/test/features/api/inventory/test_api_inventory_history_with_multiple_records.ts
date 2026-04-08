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
 * Test retrieving inventory history for a product variant with multiple stock movement records.
 *
 * Validates the complete inventory history retrieval flow including seller authentication,
 * product creation, variant creation, and multiple inventory stock movements (restock and order_placement).
 * The test verifies that the inventory history endpoint returns paginated results with all
 * stock movement records, properly sorted by creation timestamp in descending order.
 *
 * 1. Authenticate as seller via POST /auth/seller/join
 * 2. Create a test product via POST /seller/sellers/me/products
 * 3. Create a product variant via POST /seller/sellers/me/products/{productId}/variants
 * 4. Restock inventory by adding positive quantity change (reason: 'restock')
 * 5. Simulate order placement by adding negative quantity change (reason: 'order_placement')
 * 6. Retrieve inventory history via PATCH /seller/sellers/me/variants/{variantId}/inventory/history
 * 7. Validate pagination metadata and record structure in response
 */
export async function test_api_inventory_history_with_multiple_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/seller/register",
      referrer: "https://google.com",
    },
  });
  // 2. Create a test product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          optionValues: [
            { key: "Color", value: "Red" },
            { key: "Size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Restock inventory (positive quantity change)
  const restockRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "restock",
        },
      },
    );
  typia.assert(restockRecord);
  // 5. Simulate order placement (negative quantity change)
  const orderRecord =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: -typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          reason: "order_placement",
        },
      },
    );
  typia.assert(orderRecord);
  // 6. Retrieve inventory history with empty request body (no filters)
  const historyResponse =
    await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.history.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    historyResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "current page is valid",
    historyResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    historyResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "total records >= 2",
    historyResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages is valid",
    historyResponse.pagination.pages >= 1,
  );
  // 8. Validate data array contains inventory records
  TestValidator.predicate(
    "data array has records",
    historyResponse.data.length >= 2,
  );
  // 9. Validate both reason types are present
  const reasons = historyResponse.data.map((r) => r.reason);
  TestValidator.predicate("has restock record", reasons.includes("restock"));
  TestValidator.predicate(
    "has order_placement record",
    reasons.includes("order_placement"),
  );
  // 10. Validate record structure
  const firstRecord = historyResponse.data[0];
  TestValidator.predicate(
    "record has id",
    firstRecord.id !== null && firstRecord.id !== undefined,
  );
  TestValidator.predicate(
    "record has quantity_change",
    firstRecord.quantity_change !== null,
  );
  TestValidator.predicate(
    "record has reason",
    firstRecord.reason !== null && firstRecord.reason !== undefined,
  );
  TestValidator.predicate(
    "record has created_at",
    firstRecord.created_at !== null && firstRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "record has variant",
    firstRecord.variant !== null && firstRecord.variant !== undefined,
  );
  // 11. Validate variant summary in record
  TestValidator.equals(
    "variant id matches",
    firstRecord.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant sku code matches",
    firstRecord.variant.skuCode,
    variant.skuCode,
  );
  // 12. Validate total records count matches created inventory records (2 records)
  TestValidator.equals(
    "total records equals created count",
    historyResponse.pagination.records,
    2,
  );
}
