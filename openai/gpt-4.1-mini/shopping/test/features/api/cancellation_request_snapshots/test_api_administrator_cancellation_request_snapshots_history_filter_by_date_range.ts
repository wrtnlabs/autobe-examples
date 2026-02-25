import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_cancellation_request_snapshots_history_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authorize join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Generate date filter range for testing
  //   - Use fixed from and to dates with clear order
  const requestedAtFrom = new Date(Date.UTC(2023, 0, 1, 0, 0, 0)).toISOString(); // 2023-01-01T00:00:00Z
  const requestedAtTo = new Date(
    Date.UTC(2023, 11, 31, 23, 59, 59),
  ).toISOString(); // 2023-12-31T23:59:59Z
  // 3. Prepare request body with date filters and pagination
  const body: IShoppingMallCancellationRequestSnapshot.IRequest = {
    requestedAtFrom,
    requestedAtTo,
    page: 1,
    limit: 50,
  };
  // 4. Request cancellation request snapshots history with date range filtering
  const response =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", response.pagination.limit === 50);
  TestValidator.predicate(
    "pagination pages greater or equal",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count",
    response.pagination.records >= 0,
  );
  // 6. Validate each snapshot entry
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    // Validate snapshot requestedAt is within range by comparing createdAt
    TestValidator.predicate(
      `snapshot createdAt >= requestedAtFrom (${requestedAtFrom})`,
      snapshot.createdAt >= requestedAtFrom,
    );
    TestValidator.predicate(
      `snapshot createdAt <= requestedAtTo (${requestedAtTo})`,
      snapshot.createdAt <= requestedAtTo,
    );
    // Check immutable fields: id, reason, status, cancellationRequestId presence
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has reason",
      typeof snapshot.reason === "string",
    );
    TestValidator.predicate(
      "snapshot has status",
      typeof snapshot.status === "string",
    );
    TestValidator.predicate(
      "snapshot has cancellationRequestId",
      typeof snapshot.cancellationRequestId === "string",
    );
    // Confirm deletedAt is either string or null
    TestValidator.predicate(
      "snapshot deletedAt is string or null",
      snapshot.deletedAt === null || typeof snapshot.deletedAt === "string",
    );
  }
  // 7. Boundary tests - no snapshots expected for future date range
  const futureFrom = new Date(Date.UTC(2099, 0, 1)).toISOString();
  const futureTo = new Date(Date.UTC(2099, 11, 31)).toISOString();
  const futureResponse =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
      adminConnection,
      {
        body: {
          requestedAtFrom: futureFrom,
          requestedAtTo: futureTo,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future date range results empty",
    futureResponse.data.length,
    0,
  );
  // 8. Boundary tests - exactly requestedAtFrom or requestedAtTo
  const exactFromResponse =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
      adminConnection,
      { body: { requestedAtFrom, page: 1, limit: 10 } },
    );
  typia.assert(exactFromResponse);
  for (const snapshot of exactFromResponse.data) {
    TestValidator.predicate(
      "snapshot createdAt >= exact requestedAtFrom",
      snapshot.createdAt >= requestedAtFrom,
    );
  }
  const exactToResponse =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
      adminConnection,
      { body: { requestedAtTo, page: 1, limit: 10 } },
    );
  typia.assert(exactToResponse);
  for (const snapshot of exactToResponse.data) {
    TestValidator.predicate(
      "snapshot createdAt <= exact requestedAtTo",
      snapshot.createdAt <= requestedAtTo,
    );
  }
  // 9. Confirm stability on empty filter (all data)
  const allDataResponse =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
      adminConnection,
      { body: { page: 1, limit: 20 } },
    );
  typia.assert(allDataResponse);
  TestValidator.predicate(
    "all data response has data array",
    Array.isArray(allDataResponse.data),
  );
}
