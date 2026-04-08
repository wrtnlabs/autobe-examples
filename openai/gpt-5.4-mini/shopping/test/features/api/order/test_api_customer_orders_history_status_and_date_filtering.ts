import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_customer_orders_history_status_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const requestedStatus = RandomGenerator.pick([
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const);
  const page = 1 satisfies number;
  const limit = 10 satisfies number;
  const output = await api.functional.mallPlatform.customer.orders.index(
    customerConnection,
    {
      body: {
        page,
        limit,
        status: requestedStatus,
        createdAtFrom,
        createdAtTo,
      } satisfies IMallPlatformOrder.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", output.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  for (const order of output.data) {
    TestValidator.equals(
      "customer id matches authenticated customer",
      order.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      "order status matches requested filter",
      order.status,
      requestedStatus,
    );
    TestValidator.predicate(
      "order createdAt is within lower bound",
      order.createdAt >= createdAtFrom,
    );
    TestValidator.predicate(
      "order createdAt is within upper bound",
      order.createdAt <= createdAtTo,
    );
  }
}
