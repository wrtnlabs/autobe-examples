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

export async function test_api_administrator_cancellation_request_snapshots_retrieve_all(
  connection: api.IConnection,
): Promise<void> {
  // Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // Prepare request with no filters to retrieve all cancellation request snapshots
  const requestBody: IShoppingMallCancellationRequestSnapshot.IRequest = {};
  // Retrieve paginated list of cancellation request snapshots
  const output =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.index(
      adminConnection,
      { body: requestBody },
    );
  // Assert output structure and types
  typia.assert(output);
  // Validate pagination metadata
  typia.assertGuard(output.pagination);
  TestValidator.predicate(
    "pagination current >= 1",
    output.pagination.current >= 1,
  );
  typia.assertGuard(output.data);
  // Validate each snapshot record in the data
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    typia.assertGuard(snapshot.id);
    typia.assertGuard(snapshot.reason);
    typia.assertGuard(snapshot.status);
    typia.assertGuard(snapshot.createdAt);
    typia.assertGuard(snapshot.updatedAt);
    // deletedAt can be null or string datetime
    if (snapshot.deletedAt !== null) {
      typia.assertGuard(snapshot.deletedAt);
    }
    typia.assertGuard(snapshot.cancellationRequestId);
  }
}
