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

export async function test_api_cancellation_request_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create a new customer authentication context
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Retrieve cancellation requests for the authenticated customer
  const cancellationRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.get(
      customerConnection,
    );
  typia.assert(cancellationRequests);
  // Validate the response structure
  TestValidator.equals(
    "pagination records should be 0",
    cancellationRequests.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    cancellationRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    cancellationRequests.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    cancellationRequests.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    cancellationRequests.data.length,
    0,
  );
  TestValidator.predicate(
    "data array is empty",
    cancellationRequests.data.length === 0,
  );
}
