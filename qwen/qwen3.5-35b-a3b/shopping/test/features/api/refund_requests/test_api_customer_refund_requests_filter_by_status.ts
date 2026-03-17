import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account using SDK function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult: IEcommerceMallCustomer.IAuthorized =
    await api.functional.ecommerceMall.auth.customer.join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(joinResult);
  // Step 2: Create customer connection using token from join result
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // Step 3: Test filtering by 'pending' status
  const pendingFilter: IEcommerceMallRefundRequest.IRequest = {
    status: "pending",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const pendingResult: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter applied",
    pendingResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending filter limit",
    pendingResult.pagination.limit,
    20,
  );
  // Validate all returned refund requests have 'pending' status
  pendingResult.data.forEach((refundRequest) => {
    TestValidator.equals(
      "pending refund request status",
      refundRequest.status,
      "pending",
    );
  });
  // Step 4: Test filtering by 'approved' status
  const approvedFilter: IEcommerceMallRefundRequest.IRequest = {
    status: "approved",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const approvedResult: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter applied",
    approvedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved filter limit",
    approvedResult.pagination.limit,
    20,
  );
  // Validate all returned refund requests have 'approved' status
  approvedResult.data.forEach((refundRequest) => {
    TestValidator.equals(
      "approved refund request status",
      refundRequest.status,
      "approved",
    );
  });
  // Step 5: Test filtering by 'rejected' status
  const rejectedFilter: IEcommerceMallRefundRequest.IRequest = {
    status: "rejected",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const rejectedResult: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter applied",
    rejectedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected filter limit",
    rejectedResult.pagination.limit,
    20,
  );
  // Validate all returned refund requests have 'rejected' status
  rejectedResult.data.forEach((refundRequest) => {
    TestValidator.equals(
      "rejected refund request status",
      refundRequest.status,
      "rejected",
    );
  });
  // Step 6: Test pagination with status filter
  const paginationTestFilter: IEcommerceMallRefundRequest.IRequest = {
    status: "pending",
    page: 2,
    limit: 5,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const paginationResult: IPageIEcommerceMallRefundRequest.ISummary =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: paginationTestFilter },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination page number",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    5,
  );
}
