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

export async function test_api_order_history_customer_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies Partial<IShoppingMallCustomer.IJoin>;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);
  TestValidator.equals(
    "joined customer email matches",
    authorized.email,
    joinBody.email,
  );
  const request = {
    sort: "+created_at",
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallOrder.IRequest;
  const page = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert<IPageIShoppingMallOrder.ISummary>(page);
  TestValidator.equals(
    "pagination current matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  if (page.pagination.records === 0) {
    TestValidator.equals(
      "empty history has zero pages",
      page.pagination.pages,
      0,
    );
    TestValidator.equals("empty history returns no data", page.data.length, 0);
  } else {
    TestValidator.predicate(
      "current page within total pages when records exist",
      page.pagination.current >= 1 &&
        page.pagination.current <= page.pagination.pages,
    );
    TestValidator.predicate(
      "total pages coherent with records",
      page.pagination.pages >= 1,
    );
  }
  const ids = new Set<string>();
  for (const summary of page.data) {
    typia.assert<IShoppingMallOrder.ISummary>(summary);
    TestValidator.predicate(
      "order id unique within page",
      ids.has(summary.id) === false,
    );
    ids.add(summary.id);
    TestValidator.predicate("order code non-empty", summary.code.length > 0);
    TestValidator.predicate(
      "order status non-empty",
      summary.status.length > 0,
    );
    TestValidator.predicate(
      "order total price non-negative",
      summary.total_price >= 0,
    );
  }
  for (let i = 1; i < page.data.length; ++i) {
    TestValidator.predicate(
      "order history sorted by created_at ascending",
      page.data[i - 1].created_at <= page.data[i].created_at,
    );
  }
}
