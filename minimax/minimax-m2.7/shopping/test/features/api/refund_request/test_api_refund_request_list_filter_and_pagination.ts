import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_list_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test filtering by status = 'pending'
  const pendingResult = typia.assert(
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    ),
  );
  // Validate pagination metadata structure exists
  TestValidator.equals(
    "has pagination metadata",
    pendingResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    pendingResult.data !== undefined,
    true,
  );
  // Validate all returned requests have 'pending' status
  for (const request of pendingResult.data) {
    TestValidator.equals("status is pending", request.status, "pending");
  }
  // 3. Test filtering by status = 'approved'
  const approvedResult = typia.assert(
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    ),
  );
  // Validate all returned requests have 'approved' status
  for (const request of approvedResult.data) {
    TestValidator.equals("status is approved", request.status, "approved");
  }
  // 4. Test filtering by status = 'rejected'
  const rejectedResult = typia.assert(
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    ),
  );
  // Validate all returned requests have 'rejected' status
  for (const request of rejectedResult.data) {
    TestValidator.equals("status is rejected", request.status, "rejected");
  }
  // 5. Test pagination with page=1 and limit=1
  const paginatedResult = typia.assert(
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    ),
  );
  // Validate pagination metadata - access via nested pagination.pagination
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 1",
    paginatedResult.pagination.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "records >= 0",
    paginatedResult.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages >= 0",
    paginatedResult.pagination.pagination.pages >= 0,
  );
  // If records exist, should return at most 1 item
  if (paginatedResult.data.length > 0) {
    TestValidator.equals(
      "data length is at most 1",
      paginatedResult.data.length <= 1,
      true,
    );
  }
  // 6. Test with limit=5 to verify more records can be returned
  const limit5Result = typia.assert(
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          limit: 5,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    ),
  );
  TestValidator.equals(
    "limit is 5",
    limit5Result.pagination.pagination.limit,
    5,
  );
  TestValidator.predicate("data length <= 5", limit5Result.data.length <= 5);
  // 7. Test without filters (get all)
  const allResult = typia.assert(
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    ),
  );
  // Validate basic pagination structure exists via nested path
  TestValidator.predicate(
    "pagination.current is valid",
    allResult.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    allResult.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is valid",
    allResult.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is valid",
    allResult.pagination.pagination.pages >= 0,
  );
}
