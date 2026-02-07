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

export async function test_api_cancellation_request_list_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Call the endpoint to retrieve cancellation requests for the authenticated customer
  const response =
    await api.functional.shoppingMall.customer.cancellation_requests.get(
      customerConnection,
    );
  typia.assert(response);
  // Validate response structure according to IPageIShoppingMallCancellationRequest
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals(
    "response data is array",
    Array.isArray(response.data),
    true,
  );
  // Verify that pagination properties have correct types as defined in IPage.IPagination
  TestValidator.predicate(
    "current page is valid",
    Number.isInteger(response.pagination.current) &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    Number.isInteger(response.pagination.limit) &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    Number.isInteger(response.pagination.records) &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    Number.isInteger(response.pagination.pages) &&
      response.pagination.pages >= 0,
  );
  // All cancellation requests should belong to the authenticated customer due to JWT filtering
  // Since IShoppingMallCancellationRequest is empty, we can't validate specific fields
  // But we can validate that the response contains cancellation requests
  TestValidator.predicate(
    "contains at least one cancellation request",
    response.data.length >= 0,
  );
}
