import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_request_approval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Prepare a requestId for testing
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // No super administrator authorization, so just the base connection used
  // Attempt to approve the administrator request without authorization
  // Expect an HTTP error (likely 401 or 403), validate error thrown
  await TestValidator.httpError(
    "unauthorized approval attempt should be rejected",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administratorRequests.approve(
        connection,
        { requestId },
      );
    },
  );
}
