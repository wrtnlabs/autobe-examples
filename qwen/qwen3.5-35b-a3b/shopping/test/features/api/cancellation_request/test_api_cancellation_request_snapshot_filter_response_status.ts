import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_filter_response_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(admin);
  // 2. Test filtering with response_status='pending'
  const pendingFilter: IEcommerceMallCancellationRequestSnapshot.IRequest = {
    response_status: "pending",
    limit: 10,
    page: 1,
  };
  const pendingResult =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // 3. Test filtering with response_status='approved'
  const approvedFilter: IEcommerceMallCancellationRequestSnapshot.IRequest = {
    response_status: "approved",
    limit: 10,
    page: 1,
  };
  const approvedResult =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  // 4. Test filtering with response_status='rejected'
  const rejectedFilter: IEcommerceMallCancellationRequestSnapshot.IRequest = {
    response_status: "rejected",
    limit: 10,
    page: 1,
  };
  const rejectedResult =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  // 5. Validate response structure and pagination
  TestValidator.equals(
    "pending pagination current page",
    pendingResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending pagination limit",
    pendingResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pending pagination pages",
    pendingResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "approved pagination current page",
    approvedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved pagination limit",
    approvedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "approved pagination pages",
    approvedResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "rejected pagination current page",
    rejectedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected pagination limit",
    rejectedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "rejected pagination pages",
    rejectedResult.pagination.pages,
    0,
  );
  // 6. Validate empty data arrays for all filters
  TestValidator.equals(
    "pending data array is empty",
    pendingResult.data.length,
    0,
  );
  TestValidator.equals(
    "approved data array is empty",
    approvedResult.data.length,
    0,
  );
  TestValidator.equals(
    "rejected data array is empty",
    rejectedResult.data.length,
    0,
  );
  // 7. Test with different page numbers
  const page2PendingFilter: IEcommerceMallCancellationRequestSnapshot.IRequest =
    {
      response_status: "pending",
      limit: 5,
      page: 2,
    };
  const page2PendingResult =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      { body: page2PendingFilter },
    );
  typia.assert(page2PendingResult);
  TestValidator.equals(
    "page 2 pagination current page",
    page2PendingResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination records",
    page2PendingResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 2 pagination pages",
    page2PendingResult.pagination.pages,
    0,
  );
  // 8. Test with cursor-based pagination
  const cursorFilter: IEcommerceMallCancellationRequestSnapshot.IRequest = {
    response_status: "approved",
    limit: 20,
    page: 1,
  };
  const cursorResult =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      { body: cursorFilter },
    );
  typia.assert(cursorResult);
  TestValidator.equals(
    "cursor test pagination records",
    cursorResult.pagination.records,
    0,
  );
  // 9. Test filtering with additional date range parameters
  const dateRangeFilter: IEcommerceMallCancellationRequestSnapshot.IRequest = {
    response_status: "pending",
    created_at_range: {
      gte: new Date(Date.now() - 86400000).toISOString(),
      lte: new Date().toISOString(),
    },
    limit: 10,
    page: 1,
  };
  const dateRangeResult =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter pagination records",
    dateRangeResult.pagination.records,
    0,
  );
  // 10. Test with search parameter
  const searchFilter: IEcommerceMallCancellationRequestSnapshot.IRequest = {
    response_status: "rejected",
    search: "test",
    limit: 10,
    page: 1,
  };
  const searchResult =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      { body: searchFilter },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search filter pagination records",
    searchResult.pagination.records,
    0,
  );
}
