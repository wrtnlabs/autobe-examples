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

export async function test_api_customer_order_history_list_newest_first(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const limit = 3;
  const firstPage =
    await api.functional.mallPlatform.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit,
        } satisfies IMallPlatformOrder.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "first page data length within limit",
    firstPage.data.length <= limit,
  );
  TestValidator.equals("page keys", Object.keys(firstPage).sort(), [
    "data",
    "pagination",
  ]);
  TestValidator.equals(
    "pagination keys",
    Object.keys(firstPage.pagination).sort(),
    ["current", "limit", "pages", "records"],
  );
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; i++) {
      TestValidator.predicate(
        "orders are sorted newest first",
        firstPage.data[i - 1].createdAt >= firstPage.data[i].createdAt,
      );
    }
  }
  for (const item of firstPage.data) {
    typia.assert(item);
    TestValidator.equals("summary keys", Object.keys(item).sort(), [
      "createdAt",
      "id",
      "orderNumber",
      "status",
      "totalAmount",
    ]);
    TestValidator.predicate(
      "order number present",
      item.orderNumber.length > 0,
    );
    TestValidator.predicate("status present", item.status.length > 0);
    TestValidator.predicate("total amount non-negative", item.totalAmount >= 0);
  }
  const secondPage =
    await api.functional.mallPlatform.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit,
        } satisfies IMallPlatformOrder.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page limit", secondPage.pagination.limit, limit);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.predicate(
    "second page data length within limit",
    secondPage.data.length <= limit,
  );
  TestValidator.equals("second page keys", Object.keys(secondPage).sort(), [
    "data",
    "pagination",
  ]);
  const beyondPage =
    await api.functional.mallPlatform.customer.orders.history.index(
      customerConnection,
      {
        body: {
          page: 999,
          limit,
        } satisfies IMallPlatformOrder.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    999,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, limit);
  TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
  await TestValidator.httpError(
    "unauthenticated access rejected",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.customer.orders.history.index(
        { host: connection.host },
        {
          body: {
            page: 1,
            limit,
          } satisfies IMallPlatformOrder.IRequest,
        },
      );
    },
  );
}
