import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_cancellation_request_snapshot_administrator_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword2024",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Create a cancellation request snapshot UUID for testing
  // Since no utility or SDK function is available to create snapshot, simulate an existing snapshot UUID
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve cancellation request snapshot by id
  const snapshot =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.at(
      adminConnection,
      { id: snapshotId },
    );
  typia.assert(snapshot);
  // 4. Validate all properties exist and have correct types
  TestValidator.predicate(
    "snapshot id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.predicate(
    "cancellationRequestId is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      snapshot.cancellationRequestId,
    ),
  );
  TestValidator.predicate(
    "reason is string",
    typeof snapshot.reason === "string",
  );
  TestValidator.predicate(
    "status is string",
    typeof snapshot.status === "string",
  );
  TestValidator.predicate(
    "createdAt is ISO date",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date",
    !isNaN(Date.parse(snapshot.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt is null or ISO date",
    snapshot.deletedAt === null || !isNaN(Date.parse(snapshot.deletedAt!)),
  );
}
