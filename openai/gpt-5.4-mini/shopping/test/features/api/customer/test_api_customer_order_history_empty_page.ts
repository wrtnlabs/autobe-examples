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

export async function test_api_customer_order_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformOrder.IRequest;
  const output =
    await api.functional.mallPlatform.customer.orders.history.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "empty order history pagination current",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty order history pagination limit",
    output.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty order history pagination records",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty order history pagination pages",
    output.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty order history data length",
    output.data.length,
    0,
  );
  TestValidator.equals("empty order history data container", output.data, []);
}
