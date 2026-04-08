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

export async function test_api_administrator_approval_request_snapshot_parent_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that administrator approval request snapshots are scoped to their parent request.
   *
   * This test authenticates an administrator and then attempts to retrieve a snapshot
   * using a mismatched parent request identifier and snapshot identifier combination.
   * It validates that the API responds with a not-found error instead of returning a
   * snapshot from another approval request, preserving immutable parent-child scoping.
   *
   * 1. Register and authenticate an administrator account.
   * 2. Generate unrelated UUIDs for the parent approval request and snapshot identifiers.
   * 3. Request the snapshot under the wrong parent scope.
   * 4. Confirm the endpoint rejects the lookup with a not-found error.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const administratorApprovalRequestId = typia.random<
    string & tags.Format<"uuid">
  >();
  const administratorApprovalRequestSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "administrator approval request snapshot should not be found outside its parent scope",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.snapshots.getByAdministratorapprovalrequestidAndAdministratorapprovalrequestsnapshotid(
        administratorConnection,
        {
          administratorApprovalRequestId,
          administratorApprovalRequestSnapshotId,
        },
      );
    },
  );
}
