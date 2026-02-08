import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_administrator_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminJoinOutput = await authorize_super_administrator_join(
    superAdminJoinConnection,
    { body: typia.random<IDiscussionBoardSuperAdministrator.IJoin>() },
  );
  typia.assert(superAdminJoinOutput);
  // 2. Super administrator logs in
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const superAdminLoginOutput = await authorize_super_administrator_login(
    superAdminLoginConnection,
    { body: typia.random<IDiscussionBoardSuperAdministrator.ILogin>() },
  );
  typia.assert(superAdminLoginOutput);
  // 3. Administrator joins
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
    },
  );
  typia.assert(adminJoinOutput);
  // 4. Administrator logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginOutput = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: typia.random<IDiscussionBoardAdministrator.ILogin>(),
    },
  );
  typia.assert(adminLoginOutput);
  // 5. Administrator creates an administrator request
  let createRequestOutput =
    await generate_random_discussion_board_administrator_administrator_requests_create_administrator_request(
      adminLoginConnection,
      { body: typia.random<IDiscussionBoardAdministratorRequest.ICreate>() },
    );
  createRequestOutput = typia.assert(createRequestOutput);
  // 6. Super administrator approves the created administrator request
  let approvedRequest =
    await api.functional.discussionBoard.superAdministrator.administratorRequests.approve(
      superAdminLoginConnection,
      { requestId: (createRequestOutput as any).id },
    );
  approvedRequest = typia.assert(approvedRequest);
  // 7. Validate that approval status is reflected
  TestValidator.equals(
    "request ID matches",
    (approvedRequest as any).id,
    (createRequestOutput as any).id,
  );
  TestValidator.equals(
    "request status is approved",
    (approvedRequest as any).status,
    "approved",
  );
  TestValidator.equals(
    "reason remains identical",
    (approvedRequest as any).reason,
    (createRequestOutput as any).reason,
  );
}
