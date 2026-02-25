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

export async function test_api_administrator_request_rejection_nonexistent_request(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts rejection of a non-existent administrator request by an authenticated super administrator.
  // 1. Authenticate as a super administrator using the join utility.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Setup a new connection with the access token for authenticated calls.
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Attempt to reject a non-existent request with a random UUID
  const randomRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect the call to throw HTTP error indicating not found.
  await TestValidator.httpError(
    "reject non-existent administrator request should fail",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.requests.reject.rejectRequest(
        authenticatedConnection,
        { requestId: randomRequestId },
      );
    },
  );
}
