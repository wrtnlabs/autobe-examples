import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_customer_cancellation_requests_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create cancellation requests: 2 pending, 1 approved, 1 rejected
  const pendingRequests = ArrayUtil.repeat(2, () =>
    typia.random<IEcommerceMallCancellationRequest.ISummary>(),
  );
  const approvedRequest =
    typia.random<IEcommerceMallCancellationRequest.ISummary>();
  const rejectedRequest =
    typia.random<IEcommerceMallCancellationRequest.ISummary>();
  // 3. Test filter with status='pending' - should return 2 records
  const pendingFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "pending" as const,
    page: 1,
    limit: 100,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const pendingResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResponse);
  TestValidator.equals(
    "pending filter returns 2 records",
    pendingResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pending filter pagination records matches",
    pendingResponse.pagination.records,
    2,
  );
  TestValidator.equals(
    "pending filter pagination pages matches",
    pendingResponse.pagination.pages,
    1,
  );
  for (const record of pendingResponse.data) {
    TestValidator.equals(
      "pending record status is pending",
      record.status,
      "pending",
    );
  }
  // 4. Test filter with status='approved' - should return 1 record
  const approvedFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "approved" as const,
    page: 1,
    limit: 100,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const approvedResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResponse);
  TestValidator.equals(
    "approved filter returns 1 record",
    approvedResponse.data.length,
    1,
  );
  TestValidator.equals(
    "approved filter pagination records matches",
    approvedResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "approved filter pagination pages matches",
    approvedResponse.pagination.pages,
    1,
  );
  for (const record of approvedResponse.data) {
    TestValidator.equals(
      "approved record status is approved",
      record.status,
      "approved",
    );
  }
  // 5. Test filter with status='rejected' - should return 1 record
  const rejectedFilter: IEcommerceMallCancellationRequest.IRequest = {
    status: "rejected" as const,
    page: 1,
    limit: 100,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const rejectedResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResponse);
  TestValidator.equals(
    "rejected filter returns 1 record",
    rejectedResponse.data.length,
    1,
  );
  TestValidator.equals(
    "rejected filter pagination records matches",
    rejectedResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "rejected filter pagination pages matches",
    rejectedResponse.pagination.pages,
    1,
  );
  for (const record of rejectedResponse.data) {
    TestValidator.equals(
      "rejected record status is rejected",
      record.status,
      "rejected",
    );
  }
}