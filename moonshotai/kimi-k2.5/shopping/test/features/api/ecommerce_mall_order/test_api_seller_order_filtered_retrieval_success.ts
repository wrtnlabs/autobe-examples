import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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

export async function test_api_seller_order_filtered_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  // 2. Query orders with no filters (default view)
  const allOrdersResponse =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: {} satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(allOrdersResponse);
  // 3. Query with status filter
  const statusFilterRequest = {
    status: "paid",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const statusFilteredResponse =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: statusFilterRequest,
    });
  typia.assert(statusFilteredResponse);
  TestValidator.equals(
    "pagination limit matches request",
    statusFilteredResponse.pagination.limit,
    10,
  );
  // 4. Query with date range filter
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    createdAfter: oneMonthAgo.toISOString(),
    createdBefore: now.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrder.IRequest;
  const dateRangeResponse =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResponse);
  // 5. Query with all filters combined
  const combinedRequest = {
    status: "paid",
    minTotalPrice: 1000,
    maxTotalPrice: 50000,
    createdAfter: oneMonthAgo.toISOString(),
    createdBefore: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrder.IRequest;
  const combinedResponse =
    await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
      body: combinedRequest,
    });
  typia.assert(combinedResponse);
  // 6. Test pagination navigation if multiple pages exist
  if (combinedResponse.pagination.pages > 1) {
    const page2Request = {
      page: 2,
      limit: 10,
    } satisfies IEcommerceMallOrder.IRequest;
    const page2Response =
      await api.functional.ecommerceMall.seller.orders.index(sellerConnection, {
        body: page2Request,
      });
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 pagination current is 2",
      page2Response.pagination.current,
      2,
    );
  }
}
