import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Customer account creation
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customerAuth);
  // Update connection with authorization token
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerAuth.token.access;
  // 2. Test filtering by 'pending' status
  const pendingResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestStatus: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pending pagination valid",
    () =>
      pendingResult.pagination.records >= 0 &&
      pendingResult.pagination.pages >= 0,
  );
  // 3. Test filtering by 'approved' status
  const approvedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestStatus: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved pagination valid",
    () =>
      approvedResult.pagination.records >= 0 &&
      approvedResult.pagination.pages >= 0,
  );
  // 4. Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestStatus: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected pagination valid",
    () =>
      rejectedResult.pagination.records >= 0 &&
      rejectedResult.pagination.pages >= 0,
  );
  // 5. Test filtering without status (all statuses)
  const allResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "all pagination valid",
    () => allResult.pagination.records >= 0 && allResult.pagination.pages >= 0,
  );
  // 6. Verify total count equals sum of individual status queries
  const totalFromStatuses =
    pendingResult.pagination.records +
    approvedResult.pagination.records +
    rejectedResult.pagination.records;
  TestValidator.equals(
    "total records equals sum of statuses",
    allResult.pagination.records,
    totalFromStatuses,
  );
  // 7. Verify data arrays are properly typed
  for (const item of allResult.data) {
    typia.assert(item);
  }
  // 8. Verify pagination structure consistency
  TestValidator.equals(
    "pagination current default",
    allResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit default",
    allResult.pagination.limit,
    10,
  );
}
