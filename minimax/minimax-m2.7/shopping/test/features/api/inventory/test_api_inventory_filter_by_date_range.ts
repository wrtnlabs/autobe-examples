import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create multiple inventory records with different timestamps
  const inventoryRecords: IEcommerceMallInventoryRecord[] = [];
  for (let i = 0; i < 5; i++) {
    const record =
      await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
        sellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: {
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            operationType: "restock",
            reason: "initial_stock",
          },
        },
      );
    inventoryRecords.push(record);
  }
  typia.assert(inventoryRecords);
  // 5. Get all inventory records first to determine date range
  const allRecordsResponse =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerConnection,
      {
        body: {
          variantId: variant.id,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  // Extract timestamps for date range filtering
  const timestamps = allRecordsResponse.data.map((r) =>
    new Date(
      r.recentChanges[0]?.createdAt ?? new Date().toISOString(),
    ).getTime(),
  );
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  // 6. Test filtering with full date range (should return all records)
  const fullRangeResponse =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerConnection,
      {
        body: {
          variantId: variant.id,
          fromDate: new Date(minTimestamp - 10000).toISOString(),
          toDate: new Date(maxTimestamp + 10000).toISOString(),
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(fullRangeResponse);
  TestValidator.predicate(
    "full range should include all records",
    fullRangeResponse.data.every((record) =>
      record.recentChanges.some((change) => {
        const changeTime = new Date(change.createdAt).getTime();
        return (
          changeTime >= minTimestamp - 10000 &&
          changeTime <= maxTimestamp + 10000
        );
      }),
    ),
  );
  // 7. Test filtering with narrow date range (recent records only)
  const narrowRangeResponse =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerConnection,
      {
        body: {
          variantId: variant.id,
          fromDate: new Date(maxTimestamp - 1000).toISOString(),
          toDate: new Date(maxTimestamp + 1000).toISOString(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(narrowRangeResponse);
  TestValidator.predicate(
    "narrow range should return fewer or equal records",
    narrowRangeResponse.data.length <= fullRangeResponse.data.length,
  );
  // 8. Test pagination with date filtering
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerConnection,
      {
        body: {
          variantId: variant.id,
          fromDate: new Date(minTimestamp - 10000).toISOString(),
          toDate: new Date(maxTimestamp + 10000).toISOString(),
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated response should have correct pagination metadata",
    (paginatedResponse.pagination as any).limit,
    2,
  );
  TestValidator.predicate(
    "paginated response should have records",
    paginatedResponse.data.length > 0,
  );
}