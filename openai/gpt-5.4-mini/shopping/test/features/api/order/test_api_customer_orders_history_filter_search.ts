import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_history_filter_search(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const firstResponse = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(firstResponse);
  TestValidator.predicate(
    "default order history should be sorted newest first",
    firstResponse.data.every(
      (order, index, array) =>
        index === 0 || array[index - 1].createdAt >= order.createdAt,
    ),
  );
  const searchResponse =
    await api.functional.mallPlatform.customer.orders.index(
      customerConnection,
      {
        body: {
          search: customer.email,
          page: 1,
          limit: 20,
        } satisfies IMallPlatformOrder.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search results should be sorted newest first",
    searchResponse.data.every(
      (order, index, array) =>
        index === 0 || array[index - 1].createdAt >= order.createdAt,
    ),
  );
  const statusResponse =
    await api.functional.mallPlatform.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 20,
        } satisfies IMallPlatformOrder.IRequest,
      },
    );
  typia.assert(statusResponse);
  TestValidator.predicate(
    "status filtered results should all match requested status",
    statusResponse.data.every((order) => order.status === "paid"),
  );
  TestValidator.predicate(
    "status filtered results should be sorted newest first",
    statusResponse.data.every(
      (order, index, array) =>
        index === 0 || array[index - 1].createdAt >= order.createdAt,
    ),
  );
  const rangeResponse = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        createdAtFrom: "2020-01-01T00:00:00.000Z",
        createdAtTo: "2099-12-31T23:59:59.999Z",
        page: 1,
        limit: 20,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(rangeResponse);
  TestValidator.predicate(
    "date range results should be sorted newest first",
    rangeResponse.data.every(
      (order, index, array) =>
        index === 0 || array[index - 1].createdAt >= order.createdAt,
    ),
  );
  TestValidator.predicate(
    "date range results should fall within requested bounds",
    rangeResponse.data.every(
      (order) =>
        order.createdAt >= "2020-01-01T00:00:00.000Z" &&
        order.createdAt <= "2099-12-31T23:59:59.999Z",
    ),
  );
  const emptyResponse = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(32),
        status: "refunded",
        createdAtFrom: "1900-01-01T00:00:00.000Z",
        createdAtTo: "1900-01-02T00:00:00.000Z",
        page: 1,
        limit: 20,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty response data length",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty response records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty response current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty response limit",
    emptyResponse.pagination.limit,
    20,
  );
}
