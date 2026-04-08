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

export async function test_api_administrator_approval_request_snapshot_visibility_control(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator approval request snapshot visibility control.
   *
   * This scenario validates that administrator approval request snapshots are not
   * exposed through an unauthenticated connection and remain protected for the
   * proper administrative context. It focuses on access control for immutable
   * historical governance records rather than reconstructing live data.
   *
   * 1. Create an isolated connection that is not authorized for administrator access.
   * 2. Attempt to read a snapshot using valid UUID-shaped identifiers.
   * 3. Confirm the endpoint rejects the request without revealing snapshot data.
   */
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "administrator approval request snapshot should be protected from unauthorized access",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.getByAdministratorapprovalrequestidAndSnapshotid(
        unauthenticatedConnection,
        {
          administratorApprovalRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
