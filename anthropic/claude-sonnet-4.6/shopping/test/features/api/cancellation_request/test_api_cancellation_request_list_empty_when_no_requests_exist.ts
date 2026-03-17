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

export async function test_api_cancellation_request_list_empty_when_no_requests_exist(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a brand new customer with no orders or cancellation requests
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Call the cancellation requests list with empty body (no filters)
  const emptyPage =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyPage);
  // 3. Validate the empty page result
  TestValidator.equals("data array is empty", emptyPage.data.length, 0);
  TestValidator.equals("records is zero", emptyPage.pagination.records, 0);
  TestValidator.equals("pages is zero", emptyPage.pagination.pages, 0);
  TestValidator.equals("current page is 1", emptyPage.pagination.current, 1);
  // 4. Call with status='pending' filter and verify still empty
  const filteredPage =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredPage);
  // 5. Validate filtered empty page
  TestValidator.equals(
    "filtered data array is empty",
    filteredPage.data.length,
    0,
  );
  TestValidator.equals(
    "filtered records is zero",
    filteredPage.pagination.records,
    0,
  );
}
