import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve empty order history with default pagination
  const page: IPageIECommerceMallOrder.ISummary =
    await api.functional.eCommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {} satisfies IECommerceMallOrder.IRequest,
      },
    );
  typia.assert(page);
  // 3. Validate empty paginated response
  TestValidator.equals("data is empty array", page.data, []);
  TestValidator.equals("pagination.current is 1", page.pagination.current, 1);
  TestValidator.equals("pagination.limit is 20", page.pagination.limit, 20);
  TestValidator.equals("pagination.records is 0", page.pagination.records, 0);
  TestValidator.equals("pagination.pages is 0", page.pagination.pages, 0);
}
