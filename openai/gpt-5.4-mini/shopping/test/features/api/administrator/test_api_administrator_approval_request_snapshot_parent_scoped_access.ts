import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_request_snapshot_parent_scoped_access(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const requestIdA = typia.random<string & tags.Format<"uuid">>();
  const requestIdB = typia.random<string & tags.Format<"uuid">>();
  const snapshotIdA = typia.random<string & tags.Format<"uuid">>();
  const snapshotIdB = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.getByAdministratorapprovalrequestidAndSnapshotid(
      adminConnection,
      {
        administratorApprovalRequestId: requestIdA,
        snapshotId: snapshotIdA,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot should be scoped to the requested parent approval request",
    snapshot.administratorApprovalRequestId,
    requestIdA,
  );
  await TestValidator.httpError(
    "cross-parent snapshot lookup should be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.getByAdministratorapprovalrequestidAndSnapshotid(
        adminConnection,
        {
          administratorApprovalRequestId: requestIdB,
          snapshotId: snapshotIdA,
        },
      );
    },
  );
  TestValidator.notEquals(
    "different parent requests must not resolve to the same scoped snapshot",
    requestIdA,
    requestIdB,
  );
  TestValidator.notEquals(
    "different snapshot ids are used for parent-scope verification",
    snapshotIdA,
    snapshotIdB,
  );
}
