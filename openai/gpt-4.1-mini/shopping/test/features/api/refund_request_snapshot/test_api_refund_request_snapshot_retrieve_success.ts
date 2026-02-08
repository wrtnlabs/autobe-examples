import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_refund_request_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create a random UUID for snapshot id to test
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the refund request snapshot by id
  const snapshot = await api.functional.shoppingMall.refundRequestSnapshots.at(
    adminConnection,
    {
      id: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 4. Removed property existence checks because those properties do not exist on IShoppingMallRefundRequestSnapshot

  // 5. Authorization enforcement: invalid access should return http error
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () => {
      const unauthConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.refundRequestSnapshots.at(
        unauthConnection,
        {
          id: snapshotId,
        },
      );
    },
  );
  // 6. Error on invalid id (not existing)
  await TestValidator.httpError(
    "not found error on invalid id",
    404,
    async () => {
      const invalidId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMall.refundRequestSnapshots.at(
        adminConnection,
        {
          id: invalidId,
        },
      );
    },
  );
}
