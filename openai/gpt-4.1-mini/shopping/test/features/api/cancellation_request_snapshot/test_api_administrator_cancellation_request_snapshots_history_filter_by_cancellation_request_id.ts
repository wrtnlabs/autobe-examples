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

export async function test_api_administrator_cancellation_request_snapshots_history_filter_by_cancellation_request_id(
  connection: api.IConnection,
): Promise<void> {
  // Register and authenticate as administrator using join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: adminAuth.token.access,
  };
  // Generate a random cancellationRequestId to filter with
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // Execute the history index API with filter by cancellationRequestId
  const response =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
      adminConnection,
      {
        body: {
          cancellationRequestId: cancellationRequestId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // Validate that all snapshots in response.data have the requested cancellationRequestId
  for (const snapshot of response.data) {
    TestValidator.equals(
      "cancellationRequestId in snapshots",
      snapshot.cancellationRequestId,
      cancellationRequestId,
    );
    // Validate immutability: Check createdAt <= updatedAt and deletedAt is null or date-time string
    TestValidator.predicate(
      "createdAt <= updatedAt",
      new Date(snapshot.createdAt) <= new Date(snapshot.updatedAt),
    );
    TestValidator.predicate(
      "deletedAt is null or date-time",
      snapshot.deletedAt === null || !isNaN(Date.parse(snapshot.deletedAt)),
    );
  }
  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is <= 10",
    response.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
}
