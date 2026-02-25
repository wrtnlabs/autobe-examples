import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusLog";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_status_history_multiple_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
    password: "1234" as string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    href: "https://example.com/register" as string & tags.Format<"uri">,
    referrer: "https://example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customer);
  // 2. Get order status logs
  const statusLogs =
    await api.functional.shoppingMall.customer.orders.status_logs.index(
      customerConnection,
      {
        orderId: customer.customer.id,
      },
    );
  typia.assert(statusLogs);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination",
    typeof statusLogs.pagination,
    "object",
  );
  TestValidator.predicate("has data array", Array.isArray(statusLogs.data));
  // 4. Validate each status log entry
  for (const log of statusLogs.data) {
    typia.assert(log);
    TestValidator.equals("has id", typeof log.id, "string");
    TestValidator.equals(
      "has previous_status",
      typeof log.previous_status,
      "string",
    );
    TestValidator.equals("has new_status", typeof log.new_status, "string");
    TestValidator.equals("has reason", typeof log.reason, "string");
    TestValidator.predicate(
      "has changed_by",
      log.changed_by === null || typeof log.changed_by === "object",
    );
  }
}