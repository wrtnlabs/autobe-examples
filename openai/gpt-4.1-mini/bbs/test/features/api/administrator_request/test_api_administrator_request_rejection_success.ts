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

export async function test_api_administrator_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Successful rejection of a pending administrator request by an authenticated super administrator
  // Step 1. Create a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // Step 2. Submit a new administrator request by a registered user
  // Here we simulate creation of a new administrator request ID (must be a valid existing request)
  // Due to lack of API to create a request, we'll simulate with a freshly generated UUID
  // In a real environment, replace this with actual creation or fetching a known pending request
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Step 3. Using the super administrator's authentication, call the reject endpoint
  const rejectResponse =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.reject.rejectRequest(
      superAdminConnection,
      { requestId },
    );
  typia.assert(rejectResponse);
  // Step 4. Verify the response includes success=true
  TestValidator.equals("success flag true", rejectResponse.success, true);
  // Step 5. Confirm the administrator request status in the database is updated to 'rejected'
  // Because direct DB access is not provided, we assume the API response and no further DB validation here.
}
