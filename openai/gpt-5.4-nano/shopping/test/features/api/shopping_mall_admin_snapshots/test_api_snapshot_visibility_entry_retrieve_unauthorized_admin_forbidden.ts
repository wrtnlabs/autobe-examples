import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_visibility_entry_retrieve_unauthorized_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  // 1) Register an admin via POST /shoppingMall/auth/admin/join (admin A)
  const adminJoinBody: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuth);
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = { Authorization: adminAuth.token.access };
  // Prepare snapshotId and snapshotPartyId
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshotPartyId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized admin should be forbidden",
    [403, 401],
    async () =>
      await api.functional.shoppingMall.admin.snapshots.parties.at(
        authorizedConnection,
        {
          snapshotId,
          snapshotPartyId,
        },
      ),
  );
}
