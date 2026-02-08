import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_snapshots_retrieval_with_filters_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Authenticate as a new customer by joining
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    });
  // Set up authenticated connection
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // Scenario 1: Fetch with empty filters as IRequest is currently empty
  const output1 =
    await api.functional.shoppingMall.customer.order_snapshots.index(
      customerConnection,
      {
        body: {} as IShoppingMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(output1);
  // Assert pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    output1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    output1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages valid",
    output1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    output1.pagination.records >= 0,
  );
  // Scenario 2: Retrieve with empty filters again (since no filters exist), could simulate no results by assuming empty data is valid
  const output2 =
    await api.functional.shoppingMall.customer.order_snapshots.index(
      customerConnection,
      {
        body: {} as IShoppingMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(output2);
  if (output2.pagination.records === 0) {
    TestValidator.equals("no result data length", output2.data.length, 0);
    TestValidator.equals(
      "no result pagination records",
      output2.pagination.records,
      0,
    );
    TestValidator.equals(
      "no result pagination pages",
      output2.pagination.pages,
      0,
    );
  }
  // Scenario 3: Attempt without authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to order-snapshots",
    401,
    async () => {
      await api.functional.shoppingMall.customer.order_snapshots.index(
        unauthorizedConnection,
        {
          body: {} as IShoppingMallOrderSnapshot.IRequest,
        },
      );
    },
  );
}
