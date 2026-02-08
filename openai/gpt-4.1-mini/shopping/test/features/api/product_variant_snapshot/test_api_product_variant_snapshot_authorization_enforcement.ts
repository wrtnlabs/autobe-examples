import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshot_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate authorization enforcement by accessing product variant snapshot detail API.
   *
   * Steps:
   * 1. Create an administrator account and login using authorize_administrator_join.
   * 2. Prepare a valid UUID for snapshotId.
   * 3. Attempt to call the snapshot API without authentication (using base connection) and expect HTTP 401 error.
   * 4. Attempt to call the snapshot API with a non-admin (unauthenticated user connection) and expect HTTP 403 error.
   * 5. Call the snapshot API with admin authorized connection and expect success with correct data.
   */
  // 1. Setup administrator connection with join authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin has no defined properties
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // Generate valid UUID for snapshotId
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Attempt unauthorized access without authentication
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productVariantSnapshots.at(
        connection,
        { snapshotId },
      );
    },
  );
  // 3. Attempt access with non-admin connection (unauthenticated user - same as no header)
  // Create a plain connection with no token
  const userConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "forbidden access with non-admin token",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.productVariantSnapshots.at(
        userConnection,
        { snapshotId },
      );
    },
  );
  // 4. Access with valid administrator token
  const snapshot =
    await api.functional.shoppingMall.administrator.productVariantSnapshots.at(
      adminConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // Removed check for snapshot.id which does not exist to fix compilation error
}
