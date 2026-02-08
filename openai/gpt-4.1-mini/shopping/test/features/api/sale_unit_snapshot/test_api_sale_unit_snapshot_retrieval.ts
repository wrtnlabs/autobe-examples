import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_unit_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin has no required fields
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Scenario 1: Successful snapshot retrieval
  {
    // Use a valid UUID snapshotId
    const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
    // Call snapshot retrieval API
    const snapshot =
      await api.functional.shoppingMall.administrator.sale_unit_snapshots.at(
        adminConnection,
        {
          snapshotId: validSnapshotId,
        },
      );
    typia.assert(snapshot);
  }
  // 3. Scenario 2: Non-existent snapshotId
  {
    const nonExistentSnapshotId = "00000000-0000-0000-0000-000000000000";
    await TestValidator.httpError(
      "404 on non-existent snapshotId",
      404,
      async () => {
        await api.functional.shoppingMall.administrator.sale_unit_snapshots.at(
          adminConnection,
          { snapshotId: nonExistentSnapshotId },
        );
      },
    );
  }
  // 4. Scenario 3: Unauthorized access
  {
    const unauthConnection: api.IConnection = { host: connection.host };
    const someSnapshotId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError("403 without admin auth", 403, async () => {
      await api.functional.shoppingMall.administrator.sale_unit_snapshots.at(
        unauthConnection,
        { snapshotId: someSnapshotId },
      );
    });
  }
}
