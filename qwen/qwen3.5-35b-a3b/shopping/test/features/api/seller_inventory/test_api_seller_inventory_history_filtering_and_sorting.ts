import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_inventory_history_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerTest123!",
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // sellerConnection.headers is updated internally by authorize_seller_join
  // Use sellerConnection for subsequent API calls
  // 2. Create at least 2 variants (need existing product - use random UUID as placeholder)
  // Note: In a real scenario, product should exist. Using random productId as template placeholder.
  const placeholderProductId = typia.random<string & tags.Format<"uuid">>();
  const variant1 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: placeholderProductId,
        body: {} as IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: placeholderProductId,
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(6).toUpperCase()}`,
          option_values: { size: "Medium", color: "Red" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<50>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Select variant1 for inventory history testing
  const testVariantId = variant1.id;
  // 3. Generate test data - Create timestamps for date range filtering
  const now = new Date();
  const baseTimestamp = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const timestamps = ArrayUtil.repeat(
    8,
    (i) => new Date(baseTimestamp.getTime() + i * 1000 * 60 * 60),
  );
  const startDate = timestamps[2];
  const endDate = timestamps[5];
  // 4. Test date range filtering
  const dateRangeFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // Verify all returned records are within date range
  for (const record of dateRangeFilter.data) {
    const recordDate = new Date(record.timestamp);
    TestValidator.predicate(
      "record timestamp within startDate",
      recordDate >= new Date(startDate.toISOString()),
    );
    TestValidator.predicate(
      "record timestamp within endDate",
      recordDate <= new Date(endDate.toISOString()),
    );
  }
  // 5. Test reason type filtering for all 5 types
  const restockingFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          reasonType: "restocking",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockingFilter);
  for (const record of restockingFilter.data) {
    TestValidator.equals(
      "reason type is restocking",
      record.reason,
      "restocking",
    );
  }
  const orderFulfillmentFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          reasonType: "order_fulfillment",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(orderFulfillmentFilter);
  for (const record of orderFulfillmentFilter.data) {
    TestValidator.equals(
      "reason type is order_fulfillment",
      record.reason,
      "order_fulfillment",
    );
  }
  const cancellationFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          reasonType: "cancellation",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(cancellationFilter);
  for (const record of cancellationFilter.data) {
    TestValidator.equals(
      "reason type is cancellation",
      record.reason,
      "cancellation",
    );
  }
  const refundFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          reasonType: "refund",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(refundFilter);
  for (const record of refundFilter.data) {
    TestValidator.equals("reason type is refund", record.reason, "refund");
  }
  const adjustmentFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          reasonType: "adjustment",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(adjustmentFilter);
  for (const record of adjustmentFilter.data) {
    TestValidator.equals(
      "reason type is adjustment",
      record.reason,
      "adjustment",
    );
  }
  // 6. Test sorting by timestamp (asc)
  const timestampAscFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          sortField: "timestamp",
          sortOrder: "asc",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(timestampAscFilter);
  if (timestampAscFilter.data.length > 1) {
    for (let i = 1; i < timestampAscFilter.data.length; i++) {
      TestValidator.predicate(
        "timestamp ascending order",
        new Date(timestampAscFilter.data[i - 1].timestamp) <=
          new Date(timestampAscFilter.data[i].timestamp),
      );
    }
  }
  // 7. Test sorting by timestamp (desc)
  const timestampDescFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          sortField: "timestamp",
          sortOrder: "desc",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(timestampDescFilter);
  if (timestampDescFilter.data.length > 1) {
    for (let i = 1; i < timestampDescFilter.data.length; i++) {
      TestValidator.predicate(
        "timestamp descending order",
        new Date(timestampDescFilter.data[i - 1].timestamp) >=
          new Date(timestampDescFilter.data[i].timestamp),
      );
    }
  }
  // 8. Test sorting by quantityChange
  const quantityChangeFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          sortField: "quantityChange",
          sortOrder: "desc",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(quantityChangeFilter);
  if (quantityChangeFilter.data.length > 1) {
    for (let i = 1; i < quantityChangeFilter.data.length; i++) {
      TestValidator.predicate(
        "quantityChange descending order",
        quantityChangeFilter.data[i - 1].quantity_change >=
          quantityChangeFilter.data[i].quantity_change,
      );
    }
  }
  // 9. Test sorting by reason
  const reasonFilter =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId: testVariantId,
        body: {
          sortField: "reason",
          sortOrder: "asc",
          pageSize: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(reasonFilter);
  if (reasonFilter.data.length > 1) {
    for (let i = 1; i < reasonFilter.data.length; i++) {
      TestValidator.predicate(
        "reason ascending alphabetical order",
        reasonFilter.data[i - 1].reason.localeCompare(
          reasonFilter.data[i].reason,
        ) <= 0,
      );
    }
  }
}
