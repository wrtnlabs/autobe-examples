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

export async function test_api_administrator_approval_request_approve_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a regular administrator cannot approve administrator approval requests.
   *
   * This test validates the governance boundary for administrator request approval.
   * It ensures that a non-super administrator account is authenticated and then
   * attempts to approve an administrator approval request, which must be rejected
   * by the platform's access-control layer.
   *
   * The scenario focuses on permission enforcement only. It does not rely on
   * request state mutation success, and it uses a valid request identifier shape
   * so the endpoint reaches authorization checks instead of failing on input format.
   *
   * 1. Create a dedicated regular administrator connection through the join flow.
   * 2. Attempt to approve a pending administrator approval request as that regular administrator.
   * 3. Assert the approval call is forbidden.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "regular administrator must not approve administrator approval requests",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.administratorApprovalRequests.approve.create(
        administratorConnection,
        {
          administratorApprovalRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
