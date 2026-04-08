import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_order_items_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      href: "https://test.com/join",
      referrer: "https://test.com",
    },
  });
  // Step 2: Create a product to establish seller context
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Define date range for testing (use recent dates relative to current time)
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateRangeFrom = oneWeekAgo.toISOString();
  const dateRangeTo = oneWeekFromNow.toISOString();
  // Step 4: Test Case 1 - Only createdAtFrom filter (items created on or after date)
  const resultFromOnly = await api.functional.ecommerceMall.seller.items.index(
    sellerConnection,
    {
      body: {
        createdAtFrom: dateRangeFrom,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(resultFromOnly);
  // Step 5: Test Case 2 - Only createdAtTo filter (items created on or before date)
  const resultToOnly = await api.functional.ecommerceMall.seller.items.index(
    sellerConnection,
    {
      body: {
        createdAtTo: dateRangeTo,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(resultToOnly);
  // Step 6: Test Case 3 - Both createdAtFrom and createdAtTo filters (inclusive range)
  const resultBothDates = await api.functional.ecommerceMall.seller.items.index(
    sellerConnection,
    {
      body: {
        createdAtFrom: dateRangeFrom,
        createdAtTo: dateRangeTo,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(resultBothDates);
  // Step 7: Test Case 4 - Date range combined with status filter
  const resultWithStatus =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: {
        createdAtFrom: dateRangeFrom,
        createdAtTo: dateRangeTo,
        status: "paid",
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(resultWithStatus);
  // Step 8: Test Case 5 - Date range combined with productId filter
  const resultWithProductId =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: {
        createdAtFrom: dateRangeFrom,
        createdAtTo: dateRangeTo,
        productId: product.id,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(resultWithProductId);
  // Step 9: Test Case 6 - Date range with pagination
  const resultWithPagination =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: {
        createdAtFrom: dateRangeFrom,
        createdAtTo: dateRangeTo,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(resultWithPagination);
}
