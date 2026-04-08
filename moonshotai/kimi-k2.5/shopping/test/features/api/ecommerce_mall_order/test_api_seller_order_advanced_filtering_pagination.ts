import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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

export async function test_api_seller_order_advanced_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(seller);
  // Step 2: Test basic order query without filters
  const basicRequest: IEcommerceMallOrder.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const basicResult = await api.functional.ecommerceMall.seller.orders.index(
    sellerConnection,
    { body: basicRequest },
  );
  typia.assert(basicResult);
  // Validate pagination structure
  TestValidator.predicate("pagination has required properties", () => {
    return (
      typeof basicResult.pagination.current === "number" &&
      typeof basicResult.pagination.limit === "number" &&
      typeof basicResult.pagination.records === "number" &&
      typeof basicResult.pagination.pages === "number"
    );
  });
  // Step 3: Test status filtering
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partially_completed",
  ] as const;
  for (const status of validStatuses) {
    const statusRequest = {
      status,
      page: 1,
      limit: 10,
    } satisfies IEcommerceMallOrder.IRequest;
    const statusResult = await api.functional.ecommerceMall.seller.orders.index(
      sellerConnection,
      { body: statusRequest },
    );
    typia.assert(statusResult);
    // Validate all returned orders have the requested status
    TestValidator.predicate(`all orders have status '${status}'`, () =>
      statusResult.data.every((order) => order.status === status),
    );
  }
  // Step 4: Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    createdAfter: oneDayAgo.toISOString(),
    createdBefore: oneDayLater.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResult);
  // Step 5: Test price range filtering
  const priceRangeRequest = {
    minTotalPrice: 0,
    maxTotalPrice: 1000000,
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const priceRangeResult =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: priceRangeRequest,
    });
  typia.assert(priceRangeResult);
  // Validate price range filter
  TestValidator.predicate("orders within price range", () => {
    const min = priceRangeRequest.minTotalPrice ?? 0;
    const max = priceRangeRequest.maxTotalPrice ?? Number.MAX_SAFE_INTEGER;
    return priceRangeResult.data.every(
      (order) => order.totalPrice >= min && order.totalPrice <= max,
    );
  });
  // Step 6: Test order number search
  const orderNumberRequest = {
    orderNumber: "ORD",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const orderNumberResult =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: orderNumberRequest,
    });
  typia.assert(orderNumberResult);
  // Step 7: Test combined filters
  const combinedRequest = {
    status: "paid",
    minTotalPrice: 100,
    maxTotalPrice: 1000000,
    createdAfter: oneDayAgo.toISOString(),
    createdBefore: oneDayLater.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const combinedResult = await api.functional.ecommerceMall.seller.orders.index(
    sellerConnection,
    { body: combinedRequest },
  );
  typia.assert(combinedResult);
  // Step 8: Test pagination with different page sizes
  const pageSizesToTest = [1, 5, 10, 20] as const;
  for (const pageSize of pageSizesToTest) {
    const paginationRequest = {
      page: 1,
      limit: pageSize,
    } satisfies IEcommerceMallOrder.IRequest;
    const paginationResult =
      await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
        body: paginationRequest,
      });
    typia.assert(paginationResult);
    // Validate page size
    TestValidator.predicate(
      `data length does not exceed limit ${pageSize}`,
      () => paginationResult.data.length <= pageSize,
    );
    // Validate pagination metadata consistency
    TestValidator.equals(
      "limit matches request",
      paginationResult.pagination.limit,
      pageSize,
    );
    // If there's more than one page, test navigating to page 2
    if (paginationResult.pagination.pages > 1) {
      const pageTwoRequest = {
        page: 2,
        limit: pageSize,
      } satisfies IEcommerceMallOrder.IRequest;
      const pageTwoResult =
        await api.functional.ecommerceMall.seller.orders.index(
          sellerConnection,
          { body: pageTwoRequest },
        );
      typia.assert(pageTwoResult);
      TestValidator.equals(
        "page number is 2",
        pageTwoResult.pagination.current,
        2,
      );
      TestValidator.predicate("page 2 has different data", () => {
        const pageOneIds = paginationResult.data.map((o) => o.id);
        const pageTwoIds = pageTwoResult.data.map((o) => o.id);
        return !pageOneIds.some((id) => pageTwoIds.includes(id));
      });
    }
  }
}
