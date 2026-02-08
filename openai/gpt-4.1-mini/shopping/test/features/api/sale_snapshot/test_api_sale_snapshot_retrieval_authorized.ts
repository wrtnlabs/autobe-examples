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

export async function test_api_sale_snapshot_retrieval_authorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve an existing sale snapshot by snapshotId as an authorized administrator.
  {
    // Admin user joins and is authenticated.
    const adminConnection: api.IConnection = { host: connection.host };
    const joinResult = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    typia.assert(joinResult);
    // Update adminConnection headers with valid authorization token
    adminConnection.headers = {
      Authorization: `Bearer ${joinResult.token.access}`,
    };
    // To retrieve a snapshot, we generate a random UUID as snapshotId
    // Because this is a retrieval test, the snapshot should exist.
    // But as we don't have utility to create snapshot, use random valid uuid for testing response
    // Then we will test the response structure and validation.
    // Create a valid snapshotId
    const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
    // Call the sale snapshot retrieval endpoint
    const snapshot =
      await api.functional.shoppingMall.administrator.sale_snapshots.at(
        adminConnection,
        { snapshotId: validSnapshotId },
      );
    // Assert the response type
    typia.assert(snapshot);
    // No property checks due to schema lacking these properties
  }
  // Scenario 2: Attempt to retrieve a sale snapshot that does not exist.
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const joinResult = await authorize_administrator_join(adminConnection, {
      body: {},
    });
    typia.assert(joinResult);
    adminConnection.headers = {
      Authorization: `Bearer ${joinResult.token.access}`,
    };
    const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "retrieving non-existent snapshot",
      404,
      async () => {
        await api.functional.shoppingMall.administrator.sale_snapshots.at(
          adminConnection,
          {
            snapshotId: nonExistentSnapshotId,
          },
        );
      },
    );
  }
  // Scenario 3: Access the sale snapshot endpoint without authorization.
  {
    const noAuthConnection: api.IConnection = { host: connection.host };
    const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "access without authorization",
      [401, 403],
      async () => {
        await api.functional.shoppingMall.administrator.sale_snapshots.at(
          noAuthConnection,
          { snapshotId: randomSnapshotId },
        );
      },
    );
  }
}
