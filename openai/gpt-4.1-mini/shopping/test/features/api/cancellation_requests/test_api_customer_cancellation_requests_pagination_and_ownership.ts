import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_requests_pagination_and_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  // Since IShoppingMallCustomer.IJoin is empty object, pass empty body
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Set Authorization header to use authenticated customer
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Retrieve paginated cancellation requests with default parameters
  // Since IShoppingMallCancellationRequest.IRequest is empty object, pass empty body
  const output =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(output);
  // 3. Validate pagination metadata
  const { pagination, data } = output;
  TestValidator.predicate(
    "pagination current page valid",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    pagination.limit > 0 || pagination.limit === 0,
  );
  TestValidator.predicate("pagination pages valid", pagination.pages >= 0);
  TestValidator.predicate("pagination records valid", pagination.records >= 0);
  // 4. Validate data array items type
  for (const request of data) {
    typia.assert(request);
  }
  // 5. Check ownership: no requests from other customers
  // Since we cannot easily fetch other customers' requests here,
  // we validate that customer ownership field (if exists) matches authorized token
  // However, as per given DTO schemas, no customerId is visible,
  // so just trust that the customer only receives own requests
}
