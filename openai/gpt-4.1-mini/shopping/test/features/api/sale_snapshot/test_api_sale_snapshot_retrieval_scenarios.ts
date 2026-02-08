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

export async function test_api_sale_snapshot_retrieval_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of sale snapshot by snapshotId
  const adminConnection1: api.IConnection = { host: connection.host };
  const joinResponse1 = await authorize_administrator_join(adminConnection1, {
    body: {},
  });
  adminConnection1.headers = {
    ...adminConnection1.headers,
    Authorization: `Bearer ${joinResponse1.token.access}`,
  };
  // Prepare a valid snapshotId (simulate random UUID)
  // Since snapshot data creation isn't provided, use a simulated random UUID
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to fetch sale snapshot with a valid UUID
  const snapshot =
    await api.functional.shoppingMall.administrator.sale_snapshots.at(
      adminConnection1,
      { snapshotId: validSnapshotId },
    );
  typia.assert(snapshot);
  // Scenario 2: Retrieval attempt of non-existent sale snapshot
  const adminConnection2: api.IConnection = { host: connection.host };
  const joinResponse2 = await authorize_administrator_join(adminConnection2, {
    body: {},
  });
  adminConnection2.headers = {
    ...adminConnection2.headers,
    Authorization: `Bearer ${joinResponse2.token.access}`,
  };
  // Use a valid UUID that likely does not exist
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetch non-existent sale snapshot should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_snapshots.at(
        adminConnection2,
        { snapshotId: nonExistentSnapshotId },
      );
    },
  );
  // Scenario 3: Unauthorized access attempt
  // Without admin login
  await TestValidator.httpError(
    "unauthorized fetch sale snapshot should return 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sale_snapshots.at(
        connection,
        {
          snapshotId: validSnapshotId,
        },
      );
    },
  );
  // Scenario 4: Concurrent access checks (optional)
  // Create multiple admin connections
  const adminConnection3: api.IConnection = { host: connection.host };
  const adminConnection4: api.IConnection = { host: connection.host };
  // Join admins
  const joinResponse3 = await authorize_administrator_join(adminConnection3, {
    body: {},
  });
  adminConnection3.headers = {
    ...adminConnection3.headers,
    Authorization: `Bearer ${joinResponse3.token.access}`,
  };
  const joinResponse4 = await authorize_administrator_join(adminConnection4, {
    body: {},
  });
  adminConnection4.headers = {
    ...adminConnection4.headers,
    Authorization: `Bearer ${joinResponse4.token.access}`,
  };
  // Concurrently fetch the same and different snapshotIds
  await Promise.all([
    (async () => {
      const snap1 =
        await api.functional.shoppingMall.administrator.sale_snapshots.at(
          adminConnection3,
          { snapshotId: validSnapshotId },
        );
      typia.assert(snap1);
    })(),
    (async () => {
      const snap2 =
        await api.functional.shoppingMall.administrator.sale_snapshots.at(
          adminConnection4,
          { snapshotId: nonExistentSnapshotId },
        );
      // Expect this call to throw 404
      await TestValidator.httpError(
        "concurrent fetch non-existent snapshot should return 404",
        404,
        async () => {
          await api.functional.shoppingMall.administrator.sale_snapshots.at(
            adminConnection4,
            { snapshotId: nonExistentSnapshotId },
          );
        },
      );
    })(),
  ]);
}
