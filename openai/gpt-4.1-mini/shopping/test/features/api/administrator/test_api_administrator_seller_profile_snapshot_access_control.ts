import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_profile_snapshot_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Setup connections
  // Use adminConnection for authorized requests
  // 2. Attempt to access a seller profile snapshot without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // We need a valid snapshot id, but we do not have a creation flow here.
  // So we generate a random UUID that will be used to attempt unauthorized access.
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve snapshot data without valid admin token
  await TestValidator.httpError(
    "unauthorized access to seller profile snapshot without token",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sellerProfileSnapshots.at(
        unauthenticatedConnection,
        { id: fakeSnapshotId },
      );
    },
  );
  // 4. Attempt with invalid token
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token.here" },
  };
  await TestValidator.httpError(
    "unauthorized access to seller profile snapshot with invalid token",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sellerProfileSnapshots.at(
        invalidTokenConnection,
        { id: fakeSnapshotId },
      );
    },
  );
}
