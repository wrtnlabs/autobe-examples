import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator approval request snapshot history retrieval.
 *
 * Validates that an authenticated administrator can read the immutable
 * administrator approval request snapshot history as a paginated audit list.
 *
 * 1. Authenticate as an administrator using an isolated connection.
 * 2. Retrieve the snapshot history.
 * 3. Validate pagination metadata and response structure.
 * 4. Verify items are ordered newest first when multiple snapshots exist.
 * 5. Confirm repeated reads return a consistent result shape.
 */
export async function test_api_administrator_approval_request_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Aa1234!@#",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.history(
      adminConnection,
    );
  typia.assert(output);
  TestValidator.predicate(
    "history pagination metadata is non-negative",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "history data length does not exceed page limit when limit is set",
    output.pagination.limit === 0 ||
      output.data.length <= output.pagination.limit,
  );
  if (output.data.length > 0) {
    for (let index = 0; index < output.data.length; index++) {
      const snapshot = output.data[index];
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot has identifier",
        snapshot.id.length > 0,
      );
      TestValidator.predicate(
        "snapshot has related approval request summary",
        snapshot.administratorApprovalRequest !== null &&
          snapshot.administratorApprovalRequest !== undefined,
      );
      TestValidator.predicate(
        "snapshot has preserved reason",
        snapshot.snapshotReason.length >= 0,
      );
      TestValidator.predicate(
        "snapshot has creation timestamp",
        snapshot.createdAt.length > 0,
      );
      if (index > 0) {
        const previous = output.data[index - 1];
        TestValidator.predicate(
          "snapshots are sorted newest first",
          previous.createdAt >= snapshot.createdAt,
        );
      }
    }
  }
  const repeated =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.history(
      adminConnection,
    );
  typia.assert(repeated);
  TestValidator.equals(
    "repeated history read preserves pagination metadata",
    repeated.pagination,
    output.pagination,
  );
  TestValidator.equals(
    "repeated history read preserves data",
    repeated.data,
    output.data,
  );
}
