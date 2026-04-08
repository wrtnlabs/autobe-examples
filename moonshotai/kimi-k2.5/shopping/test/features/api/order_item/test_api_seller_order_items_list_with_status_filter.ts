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

export async function test_api_seller_order_items_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Define all valid status values for testing
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  // 3. Test pagination without status filter
  const paginationRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: paginationRequest,
    });
  typia.assert(paginatedResponse);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current should be non-negative",
    paginatedResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be non-negative",
    paginatedResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    paginatedResponse.pagination.pages >= 0,
  );
  // 4. Test status filtering for each valid status
  for (const status of validStatuses) {
    const statusRequest = {
      page: 1,
      limit: 20,
      status: status,
    } satisfies IEcommerceMallOrderItem.IRequest;
    const statusResponse =
      await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
        body: statusRequest,
      });
    typia.assert(statusResponse);
    // Validate that all returned items have the requested status
    for (const item of statusResponse.data) {
      TestValidator.equals(
        `order item status should be ${status}`,
        item.status,
        status,
      );
    }
    // Verify pagination consistency
    TestValidator.predicate(
      "status filter pagination current should match request",
      statusResponse.pagination.current === statusRequest.page,
    );
    TestValidator.predicate(
      "status filter pagination limit should match request",
      statusResponse.pagination.limit === statusRequest.limit,
    );
    // Verify each order item has required nested structures
    for (const item of statusResponse.data) {
      // Validate seller isolation - seller information should match authenticated seller
      TestValidator.equals(
        "order item seller id should match authenticated seller",
        item.seller.id,
        sellerAuth.id,
      );
      // Validate quantity is positive
      TestValidator.predicate(
        "order item quantity should be positive",
        item.quantity >= 1,
      );
      // Validate priceAtPurchase is non-negative
      TestValidator.predicate(
        "order item priceAtPurchase should be non-negative",
        item.priceAtPurchase >= 0,
      );
    }
  }
  // 5. Test empty result pagination (high page number)
  const emptyPageRequest = {
    page: 9999,
    limit: 10,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const emptyResponse = await api.functional.ecommerceMall.seller.items.index(
    sellerConnection,
    {
      body: emptyPageRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty page should have empty data array",
    emptyResponse.data.length,
    0,
  );
  // 6. Test pagination with date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    page: 1,
    limit: 50,
    createdAtFrom: oneWeekAgo.toISOString(),
    createdAtTo: now.toISOString(),
  } satisfies IEcommerceMallOrderItem.IRequest;
  const dateRangeResponse =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResponse);
  // Validate createdAt constraints if data exists
  for (const item of dateRangeResponse.data) {
    const itemDate = new Date(item.createdAt).getTime();
    TestValidator.predicate(
      "order item createdAt should be within date range",
      itemDate >= oneWeekAgo.getTime() && itemDate <= now.getTime(),
    );
  }
}
