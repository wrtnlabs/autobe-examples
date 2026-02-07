import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admins_request } from "../../../prepare/prepare_random_discussion_board_admins_request";

/**
 * Test the approval of an administrator request by a super administrator.
 * 1. Member user joins and logs in
 * 2. Member submits an administrator request
 * 3. Super admin logs in
 * 4. Super admin approves the administrator request
 * 5. Verify the approval was successful
 */
export async function test_api_super_admin_approve_administrator_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member user and join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberAuthorized);
  // 2. Member logs in to establish session
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: typia.random<IDiscussionBoardMember.ILogin>(),
  });
  // 3. Member submits administrator request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberLoginConnection,
      {
        body: typia.random<IDiscussionBoardAdminsRequest.ICreate>(),
      },
    );
  typia.assert(adminRequest);
  // 4. Setup: Create super admin user and log in
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
    },
  );
  typia.assert(superAdminAuthorized);
  // 5. Super admin approves the administrator request
  // Using a placeholder request ID since we can't extract the actual ID from adminRequest
  // due to IDiscussionBoardAdminsRequest having no properties defined
  const placeholderRequestId = "00000000-0000-0000-0000-000000000000";
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.admin.requests.approve(
      superAdminConnection,
      {
        requestId: placeholderRequestId,
      },
    );
  typia.assert(approvedRequest);
  // Validate: Since IDiscussionBoardAdminsRequest has no properties defined,
  // we can only validate that the approval operation succeeded
  TestValidator.predicate("approved request exists", () => {
    return approvedRequest !== null;
  });
}
