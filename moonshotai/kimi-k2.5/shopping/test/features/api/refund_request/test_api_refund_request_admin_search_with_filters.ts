import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_admin_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Unfiltered search - retrieve all refund requests
  const allResults =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(allResults);
  // 3. Status filter testing - filter by "pending"
  const pendingResults =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResults);
  // 4. Status filter testing - filter by "approved"
  const approvedResults =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResults);
  // 5. Status filter testing - filter by "rejected"
  const rejectedResults =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResults);
  // 6. Date range filter testing
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResults =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          requestedAtFrom: yesterday.toISOString(),
          requestedAtTo: now.toISOString(),
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // 7. Pagination testing with specific page and limit
  const paginatedResults =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination metadata matches request parameters
  TestValidator.equals(
    "current page matches request",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedResults.pagination.limit,
    10,
  );
  // 8. Combined filters testing (status + date range + pagination)
  const combinedResults =
    await api.functional.ecommerceMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          requestedAtFrom: yesterday.toISOString(),
          requestedAtTo: now.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Validate combined filter pagination
  TestValidator.equals(
    "combined filter current page",
    combinedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedResults.pagination.limit,
    5,
  );
}
