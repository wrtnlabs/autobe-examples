import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_requests_index(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Customer retrieves a list of their refund requests successfully.
  // 1. Customer joins to create a new account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const joinResult = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(joinResult);
  // Update connection headers for authenticated requests
  customerConnection.headers = { Authorization: joinResult.token.access };
  // 2. Retrieve all refund requests by authenticated customer (without filters)
  const allRefundRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(allRefundRequests);
  // Assertions for pagination metadata
  TestValidator.predicate(
    "pagination current page at least 1",
    allRefundRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    allRefundRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count not negative",
    allRefundRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count not negative",
    allRefundRequests.pagination.pages >= 0,
  );
  // Validate that data array is an array
  TestValidator.predicate(
    "data is array",
    Array.isArray(allRefundRequests.data),
  );
}
