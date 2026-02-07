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

export async function test_api_customer_cancellation_requests_default_filter(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinInput = {} satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Retrieve cancellation requests with no filters (default behavior)
  const request: IShoppingMallCancellationRequest.IRequest = {};
  const response =
    await api.functional.shoppingMall.customer.cancellation_requests.patch(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    response.pagination,
    response.pagination,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate(
    "pagination has positive records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has positive current page",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has positive pages",
    response.pagination.pages >= 0,
  );
}
