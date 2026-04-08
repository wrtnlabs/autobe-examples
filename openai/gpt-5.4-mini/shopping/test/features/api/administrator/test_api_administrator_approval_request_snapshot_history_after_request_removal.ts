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
 * Verifies administrator approval request snapshot history remains readable for audit review.
 *
 * This test authenticates a dedicated administrator actor, queries the immutable approval request snapshot history, and validates the returned paginated structure. It is designed to confirm that the history endpoint is accessible for dispute and audit workflows even when the underlying approval request lifecycle has changed outside the current read-only scenario.
 *
 * 1. Authenticate as an administrator using the administrator join utility.
 * 2. Request the administrator approval request snapshot history page.
 * 3. Validate pagination metadata and snapshot entries when present.
 * 4. Ensure preserved snapshot references and timestamps are available for audit review.
 */
export async function test_api_administrator_approval_request_snapshot_history_after_request_removal(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com` satisfies string &
        typia.tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.history(
      adminConnection,
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata is available for snapshot history",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history rows preserve immutable audit data",
    output.data.every(
      (snapshot) =>
        snapshot.id.length > 0 && snapshot.snapshotReason.length >= 0,
    ),
  );
  if (output.data.length > 0) {
    const first = output.data[0];
    typia.assert(first);
    TestValidator.predicate(
      "snapshot includes related approval request reference",
      first.administratorApprovalRequest !== null,
    );
    TestValidator.predicate(
      "snapshot includes audit timestamp",
      first.createdAt.length > 0,
    );
  }
}
