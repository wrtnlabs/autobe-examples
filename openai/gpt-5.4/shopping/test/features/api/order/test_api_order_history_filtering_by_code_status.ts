import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_history_filtering_by_code_status(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerAuth);
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherCustomerAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(anotherCustomerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(anotherCustomerAuth);
  const baseRequest = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallOrder.IRequest;
  const unfiltered: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: baseRequest,
      },
    );
  typia.assert(unfiltered);
  TestValidator.equals(
    "unfiltered pagination current page matches request",
    unfiltered.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "unfiltered pagination limit matches request",
    unfiltered.pagination.limit,
    baseRequest.limit,
  );
  TestValidator.predicate(
    "unfiltered data length does not exceed limit",
    unfiltered.data.length <= (baseRequest.limit ?? 100),
  );
  const sampledCode: string | undefined = unfiltered.data[0]?.code;
  const partialCode: string | undefined =
    sampledCode !== undefined && sampledCode.length > 1
      ? sampledCode.slice(0, Math.max(1, Math.floor(sampledCode.length / 2)))
      : sampledCode;
  const sampledStatus: string | undefined = unfiltered.data[0]?.status;
  const codeRequest = {
    ...baseRequest,
    ...(partialCode !== undefined ? { code: partialCode } : {}),
  } satisfies IShoppingMallOrder.IRequest;
  const codeFiltered: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: codeRequest,
      },
    );
  typia.assert(codeFiltered);
  TestValidator.equals(
    "code filter pagination current page matches request",
    codeFiltered.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "code filter pagination limit matches request",
    codeFiltered.pagination.limit,
    baseRequest.limit,
  );
  if (partialCode !== undefined) {
    for (const order of codeFiltered.data) {
      TestValidator.predicate(
        "code-filtered order contains requested code fragment",
        order.code.includes(partialCode),
      );
    }
  }
  const statusRequest = {
    ...baseRequest,
    ...(sampledStatus !== undefined ? { status: sampledStatus } : {}),
  } satisfies IShoppingMallOrder.IRequest;
  const statusFiltered: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: statusRequest,
      },
    );
  typia.assert(statusFiltered);
  if (sampledStatus !== undefined) {
    for (const order of statusFiltered.data) {
      TestValidator.equals(
        "status-filtered order matches requested status",
        order.status,
        sampledStatus,
      );
    }
  }
  const rangeFrom = new Date(
    "2000-01-01T00:00:00.000Z",
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const rangeTo = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  const rangeRequest = {
    ...baseRequest,
    createdAtFrom: rangeFrom,
    createdAtTo: rangeTo,
  } satisfies IShoppingMallOrder.IRequest;
  const ranged: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: rangeRequest,
      },
    );
  typia.assert(ranged);
  const rangeFromTime: number = new Date(rangeFrom).getTime();
  const rangeToTime: number = new Date(rangeTo).getTime();
  for (const order of ranged.data) {
    const createdAtTime: number = new Date(order.created_at).getTime();
    TestValidator.predicate(
      "range-filtered order is within created_at lower bound",
      createdAtTime >= rangeFromTime,
    );
    TestValidator.predicate(
      "range-filtered order is within created_at upper bound",
      createdAtTime <= rangeToTime,
    );
  }
  const repeatedCodeFiltered: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: codeRequest,
      },
    );
  typia.assert(repeatedCodeFiltered);
  TestValidator.equals(
    "repeated identical code-filter query preserves pagination records",
    repeatedCodeFiltered.pagination.records,
    codeFiltered.pagination.records,
  );
  TestValidator.equals(
    "repeated identical code-filter query preserves item id order",
    repeatedCodeFiltered.data.map((order) => order.id),
    codeFiltered.data.map((order) => order.id),
  );
  const anotherCustomerResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.customer.orders.index(
      anotherCustomerConnection,
      {
        body: codeRequest,
      },
    );
  typia.assert(anotherCustomerResult);
  TestValidator.equals(
    "another customer pagination current page matches request",
    anotherCustomerResult.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "another customer pagination limit matches request",
    anotherCustomerResult.pagination.limit,
    baseRequest.limit,
  );
  if (partialCode !== undefined) {
    for (const order of anotherCustomerResult.data) {
      TestValidator.predicate(
        "another customer code-filtered order contains requested code fragment",
        order.code.includes(partialCode),
      );
    }
  }
}
