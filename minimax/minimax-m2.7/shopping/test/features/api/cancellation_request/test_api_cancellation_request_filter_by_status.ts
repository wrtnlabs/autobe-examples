import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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

export async function test_api_cancellation_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Test filtering by status='pending'
  const pendingResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all returned requests have 'pending' status
  for (const item of pendingResult.data) {
    TestValidator.equals(
      "pending status filter",
      item.cancellationRequest.status,
      "pending",
    );
  }
  // Test filtering by status='approved'
  const approvedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Validate all returned requests have 'approved' status
  for (const item of approvedResult.data) {
    TestValidator.equals(
      "approved status filter",
      item.cancellationRequest.status,
      "approved",
    );
  }
  // Test filtering by status='rejected'
  const rejectedResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Validate all returned requests have 'rejected' status
  for (const item of rejectedResult.data) {
    TestValidator.equals(
      "rejected status filter",
      item.cancellationRequest.status,
      "rejected",
    );
  }
  // Validate pagination structure is valid
  TestValidator.predicate(
    "pagination has valid fields",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    pendingResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    pendingResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    pendingResult.pagination.records >= 0,
  );
}
