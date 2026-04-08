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
 * Verify administrator approval request snapshot history returns an empty page when no snapshots exist.
 *
 * Validates the governance audit history endpoint for administrator approval request snapshots in the empty-state
 * scenario. The test authenticates a dedicated administrator actor, requests the history listing, and confirms the
 * API responds with a read-only paginated page structure whose records are empty and whose pagination metadata is
 * consistent with an empty collection.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Request administrator approval request snapshot history through the SDK.
 * 3. Validate the response as a paginated empty page with zero records.
 */
export async function test_api_administrator_approval_request_snapshot_history_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.administratorApprovalRequestSnapshots.history(
      administratorConnection,
    );
  typia.assert(output);
  TestValidator.equals("empty snapshot history data", output.data, []);
  TestValidator.equals(
    "empty snapshot history records",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty snapshot history pages",
    output.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty snapshot history current page",
    output.pagination.current,
    1,
  );
}
