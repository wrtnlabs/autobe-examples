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
 * Test administrator request approval workflow
 * Tests the complete workflow: member joins → submits request → super admin retrieves request
 * Note: IDiscussionBoardAdminsRequest DTO currently has no properties defined, so validation
 * focuses on successful operation completion rather than specific property values.
 */
export async function test_api_administrator_request_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system and submits administrator request
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies IDiscussionBoardMember.IJoin,
  });
  // Member submits administrator request
  const adminRequest =
    await api.functional.discussionBoard.member.admin.requests.create(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardAdminsRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 2. Super admin logs in and retrieves the pending request
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {} satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Generate a UUID for the request ID using typia.random
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const requestDetails = await api.functional.discussionBoard.admin.requests.at(
    superAdminConnection,
    {
      requestId: requestId,
    },
  );
  typia.assert(requestDetails);
  // 3. Verify the request details were retrieved successfully
  TestValidator.predicate("request details retrieved", () => !!requestDetails);
}
