import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_approval_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(adminJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(adminAuth);
  // 2. Create authenticated connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Generate random UUID that doesn't exist in the system
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve non-existent snapshot - should return 404
  await TestValidator.error("non-existent snapshot returns 404", async () => {
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.at(
      adminConnection,
      {
        snapshotId: nonExistentSnapshotId,
      },
    );
  });
}
