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

export async function test_api_administrator_approval_requests_access_control(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that regular administrators cannot access the administrator approval request review list.
   *
   * This test exercises the governance access-control boundary by first authenticating a newly joined
   * administrator account through the dedicated join utility and then attempting to read the approval
   * request queue from the privileged review endpoint.
   *
   * The scenario focuses on the access restriction itself rather than the content of the queue. It
   * confirms that an administrator account without super-administrator privileges is denied and that
   * no paginated approval-request data can be retrieved through the restricted endpoint.
   *
   * 1. Create an administrator account using the dedicated authorization utility.
   * 2. Call the approval-request review endpoint with the regular administrator connection.
   * 3. Assert that the endpoint rejects access with an HTTP authorization failure.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "regular administrator should not access approval request review list",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.approvalRequests.index(
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
