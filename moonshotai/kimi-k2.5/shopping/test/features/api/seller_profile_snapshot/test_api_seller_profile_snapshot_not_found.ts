import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_profile_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2-3. Use non-existent sellerId and snapshotId (random valid UUIDs that don't exist in DB)
  const fakeSellerId = typia.random<string & tags.Format<"uuid">>();
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify the system returns HTTP 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent seller profile snapshot",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.profile_snapshots.at(
        adminConnection,
        {
          sellerId: fakeSellerId,
          snapshotId: fakeSnapshotId,
        },
      );
    },
  );
}
