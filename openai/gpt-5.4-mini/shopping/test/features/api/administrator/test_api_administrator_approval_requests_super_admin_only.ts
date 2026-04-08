import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies that only super administrators can access the administrator approval request queue.
 *
 * This test authenticates a regular administrator account and then attempts to query the protected
 * administrator approval requests endpoint with that non-super-admin identity. It validates the
 * access-control boundary guarding the governance review queue and ensures the response does not
 * expose approval-request summaries or pagination metadata to insufficiently privileged accounts.
 *
 * 1. Register and authenticate a regular administrator account.
 * 2. Attempt to access the approval requests list using the regular administrator connection.
 * 3. Assert the request is denied and no approval-request page data is returned.
 */
export async function test_api_administrator_approval_requests_super_admin_only(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "regular administrator cannot access approval requests",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.approval_requests.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
        },
      );
    },
  );
}
