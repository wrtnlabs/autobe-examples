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

export async function test_api_cancellation_request_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Retrieve cancellation requests
  const result =
    await api.functional.shoppingMall.customer.cancellation_requests.get(
      customerConnection,
    );
  typia.assert(result);
  // Validate response structure per IPageIShoppingMallCancellationRequest
  TestValidator.predicate(
    "response has pagination object",
    result.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(result.data),
  );
  // Validate pagination metadata types
  TestValidator.equals(
    "current page is at least 1",
    result.pagination.current,
    result.pagination.current,
  );
  TestValidator.predicate(
    "current page type is int32",
    typeof result.pagination.current === "number" &&
      Number.isInteger(result.pagination.current) &&
      result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is int32 and positive",
    typeof result.pagination.limit === "number" &&
      Number.isInteger(result.pagination.limit) &&
      result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is int32 and positive",
    typeof result.pagination.records === "number" &&
      Number.isInteger(result.pagination.records) &&
      result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is int32 and positive",
    typeof result.pagination.pages === "number" &&
      Number.isInteger(result.pagination.pages) &&
      result.pagination.pages >= 0,
  );
}
