import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_administrator_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a product snapshot by a valid snapshotId by an authorized administrator
  // Scenario 2: Attempt to retrieve a product snapshot with a non-existent snapshotId by an authorized administrator (expect 404)
  // Scenario 3: Unauthorized access attempt to retrieve a product snapshot without administrator authentication (expect 401)
  // 1. Authorize administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Prepare a valid snapshot ID for successful retrieval (simulate using random UUID)
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test Scenario 1: Successful retrieval
  const snapshot =
    await api.functional.shoppingMall.administrator.productSnapshots.at(
      adminConnection,
      {
        snapshotId: validSnapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Test Scenario 2: Retrieval of non-existent snapshotId expecting 404 Not Found error
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent snapshotId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productSnapshots.at(
        adminConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
  // 5. Test Scenario 3: Unauthorized access attempt without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productSnapshots.at(
        unauthorizedConnection,
        {
          snapshotId: validSnapshotId,
        },
      );
    },
  );
}
