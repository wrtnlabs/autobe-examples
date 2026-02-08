import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_snapshot_access_control_and_existence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin is empty object
  });
  typia.assert(adminJoinResult);
  // Update adminConnection with authorized token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminJoinResult.token.access;
  // 2. Scenario 1: Retrieve an existing sale snapshot successfully
  // Generate a valid UUID for snapshotId
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.administrator.sale_snapshots.at(
      adminConnection,
      {
        snapshotId: validSnapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate presence of critical properties is not possible because IShoppingMallSaleSnapshot is empty type
  // Therefore, just ensure the type assertion passed
  // 3. Scenario 3: Attempt retrieval without administrator authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access without admin token",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.sale_snapshots.at(
        unauthorizedConnection,
        { snapshotId: validSnapshotId },
      ),
  );
  // 4. Scenario 4: Retrieve a snapshot that doesn't exist
  // Use a different valid UUID assumed to not exist
  const nonExistingSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot not found error for non-existing snapshotId",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.sale_snapshots.at(
        adminConnection,
        {
          snapshotId: nonExistingSnapshotId,
        },
      ),
  );
}
