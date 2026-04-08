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

export async function test_api_administrator_approval_request_super_admin_access_only(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify super administrator-only access to the administrator approval request queue.
   *
   * This scenario validates that an authenticated administrator without the highest
   * review privilege cannot access the approval-request list endpoint. It ensures the
   * queue remains restricted to super administrator governance workflows and that no
   * approval-request data or pagination metadata is exposed to unauthorized roles.
   *
   * 1. Register and authenticate a regular administrator account.
   * 2. Attempt to access the approval-request queue with that administrator session.
   * 3. Confirm the request is rejected as an authorization failure.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!" satisfies string,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  await TestValidator.httpError(
    "regular administrator must not access approval-request queue",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.administrators.index(
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
