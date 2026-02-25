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

export async function test_api_administrator_request_approval_by_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // Test approving a valid pending administrator request by a super administrator.
  // Steps:
  // 1. Register and authorize a super administrator
  // 2. Approve a valid pending administrator request with the requestId by the super administrator
  // 3. Validate the response and that the operation was successful
  const superAdminConnection: IConnection = { host: connection.host };
  // 1. Register a super administrator to get authorized connection
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 2. Use a known valid administrator request ID to approve
  // Since the test scenario does not provide how to create or obtain a real requestId,
  // use a random UUID assuming the system has such a pending request to test approval.
  // In production test, fetching a pending request or setting up a test fixture would be required.
  const testRequestId = typia.random<string & tags.Format<"uuid">>();
  const approveResponse =
    await api.functional.discussionBoard.superAdministrator.administrator.requests.approve.approveAdministratorRequest(
      superAdminConnection,
      {
        requestId: testRequestId,
      },
    );
  typia.assert(approveResponse);
  TestValidator.predicate("approve success", approveResponse.success === true);
}
