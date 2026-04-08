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

export async function test_api_administrator_approval_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify missing administrator approval request snapshots return not found.
   *
   * This scenario authenticates an administrator, requests a snapshot using a
   * UUID that should not correspond to any persisted record, and confirms the
   * endpoint reports a not-found error without returning snapshot content.
   *
   * 1. Authenticate as an administrator using an isolated actor connection.
   * 2. Call the snapshot lookup endpoint with a random UUID.
   * 3. Assert that the request fails with a not-found HTTP error.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator approval request snapshot not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.at(
        adminConnection,
        {
          administratorApprovalRequestSnapshotId: snapshotId,
        },
      );
    },
  );
}
