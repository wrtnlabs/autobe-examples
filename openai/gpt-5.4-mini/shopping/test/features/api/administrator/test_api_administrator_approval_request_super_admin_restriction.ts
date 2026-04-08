import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies that administrator approval request details are protected so only super administrators can access them.
 *
 * This test authenticates a regular administrator account, attempts to read a specific approval request, and confirms the request is blocked by authorization rules. It focuses on the governance boundary for approval-request review and ensures the read operation does not leak request state to non-super administrators.
 *
 * 1. Register a regular administrator account and use its authenticated connection.
 * 2. Attempt to retrieve an administrator approval request by id.
 * 3. Confirm the request is rejected with an authorization error.
 */
export async function test_api_administrator_approval_request_super_admin_restriction(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const requestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "regular administrator cannot access administrator approval request",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.administrator_approval_requests.at(
        administratorConnection,
        { requestId },
      );
    },
  );
}
