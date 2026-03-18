import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_snapshots_create";
import { generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party } from "../../../generate/generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";
import { prepare_random_shopping_mall_snapshot_party } from "../../../prepare/prepare_random_shopping_mall_snapshot_party";

export async function test_api_snapshot_view_denied_invisible_visibility_rule(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin setup (join -> use returned access token)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(adminAuth);
  const authorizedAdminConnection: api.IConnection = { host: connection.host };
  authorizedAdminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2) Create snapshot
  const snapshot = await generate_random_shopping_mall_admin_snapshots_create(
    authorizedAdminConnection,
    {},
  );
  typia.assert(snapshot);
  // 3) Add invisible visibility entry (can_view=false)
  await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
    authorizedAdminConnection,
    {
      params: { snapshotId: snapshot.id },
      body: {
        partyType: typia.random<string & tags.MinLength<1>>(),
        partyId: adminAuth.id,
        canView: false,
      } satisfies IShoppingMallSnapshotParty.ICreate,
    },
  );
  // 4) Attempt to view snapshot (deny access; must not leak snapshot details)
  await TestValidator.error(
    "snapshot view denied for admin when can_view=false",
    async () => {
      await api.functional.shoppingMall.admin.snapshots.at(
        authorizedAdminConnection,
        { snapshotId: snapshot.id },
      );
    },
  );
}
