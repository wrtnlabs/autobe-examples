import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_customer_refund_request_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join account and create customer-specific connection
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinResponse = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(customerJoinResponse);
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerJoinResponse.token.access,
    },
  };
  // 2. Test filtering by 'pending' status
  const pendingFilterBody = {
    request_status: "pending",
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const pendingResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: pendingFilterBody },
    );
  typia.assert(pendingResponse);
  // Validate all pending items have correct status
  for (const item of pendingResponse.data) {
    TestValidator.equals("pending item status", item.request_status, "pending");
  }
  // 3. Test filtering by 'approved' status
  const approvedFilterBody = {
    request_status: "approved",
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const approvedResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: approvedFilterBody },
    );
  typia.assert(approvedResponse);
  // Validate all approved items have correct status
  for (const item of approvedResponse.data) {
    TestValidator.equals(
      "approved item status",
      item.request_status,
      "approved",
    );
  }
  // 4. Test filtering by 'rejected' status
  const rejectedFilterBody = {
    request_status: "rejected",
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const rejectedResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: rejectedFilterBody },
    );
  typia.assert(rejectedResponse);
  // Validate all rejected items have correct status
  for (const item of rejectedResponse.data) {
    TestValidator.equals(
      "rejected item status",
      item.request_status,
      "rejected",
    );
  }
  // 5. Validate pagination metadata for all filters
  TestValidator.equals(
    "pending pagination current",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved pagination current",
    approvedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected pagination current",
    rejectedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pending pagination records non-negative",
    pendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved pagination records non-negative",
    approvedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "rejected pagination records non-negative",
    rejectedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending pagination limit positive",
    pendingResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "approved pagination limit positive",
    approvedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "rejected pagination limit positive",
    rejectedResponse.pagination.limit > 0,
  );
  // 6. Validate data length is within bounds
  TestValidator.predicate(
    "pending data length within bounds",
    pendingResponse.data.length <= pendingResponse.pagination.records,
  );
  TestValidator.predicate(
    "approved data length within bounds",
    approvedResponse.data.length <= approvedResponse.pagination.records,
  );
  TestValidator.predicate(
    "rejected data length within bounds",
    rejectedResponse.data.length <= rejectedResponse.pagination.records,
  );
  // 7. Validate each data item has required fields
  for (const item of pendingResponse.data) {
    TestValidator.predicate(
      "pending item has valid id",
      item.id !== undefined && item.id !== null,
    );
    TestValidator.predicate(
      "pending item has orderItem",
      item.orderItem !== undefined && item.orderItem !== null,
    );
    TestValidator.predicate(
      "pending item has reason",
      item.reason !== undefined &&
        item.reason !== null &&
        item.reason.length > 0,
    );
    TestValidator.predicate(
      "pending item has created_at",
      item.created_at !== undefined && item.created_at !== null,
    );
  }
  for (const item of approvedResponse.data) {
    TestValidator.predicate(
      "approved item has valid id",
      item.id !== undefined && item.id !== null,
    );
    TestValidator.predicate(
      "approved item has orderItem",
      item.orderItem !== undefined && item.orderItem !== null,
    );
    TestValidator.predicate(
      "approved item has reason",
      item.reason !== undefined &&
        item.reason !== null &&
        item.reason.length > 0,
    );
    TestValidator.predicate(
      "approved item has created_at",
      item.created_at !== undefined && item.created_at !== null,
    );
  }
  for (const item of rejectedResponse.data) {
    TestValidator.predicate(
      "rejected item has valid id",
      item.id !== undefined && item.id !== null,
    );
    TestValidator.predicate(
      "rejected item has orderItem",
      item.orderItem !== undefined && item.orderItem !== null,
    );
    TestValidator.predicate(
      "rejected item has reason",
      item.reason !== undefined &&
        item.reason !== null &&
        item.reason.length > 0,
    );
    TestValidator.predicate(
      "rejected item has created_at",
      item.created_at !== undefined && item.created_at !== null,
    );
  }
}
