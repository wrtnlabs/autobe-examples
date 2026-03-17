import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_detail_cross_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Customer A and set up their authenticated connection
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // Step 2: As Customer A, list their sessions to get sessionIdA
  const customerASessionsPage =
    await api.functional.shoppingMall.customer.sessions.index(
      customerAConnection,
      {
        body: {} satisfies IShoppingMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(customerASessionsPage);
  // Customer A must have at least one session (created during join)
  TestValidator.predicate(
    "Customer A has at least one session",
    customerASessionsPage.data.length > 0,
  );
  const sessionIdA = customerASessionsPage.data[0]!.id;
  // Step 3: Register Customer B and set up their authenticated connection
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // Step 4 & 5: As Customer B, attempt to access Customer A's session — must fail with 404
  await TestValidator.httpError(
    "Customer B cannot access Customer A's session (cross-customer isolation)",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sessions.at(
        customerBConnection,
        {
          sessionId: sessionIdA,
        },
      );
    },
  );
}
