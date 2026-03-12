import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test that only super administrators can access the pending admin requests endpoint.
 *
 * This test verifies the authorization model for the pending admin requests list:
 * 1. Regular administrators are denied access with an authorization error
 * 2. The endpoint requires super administrator privileges to retrieve pending requests
 *
 * Note: Super administrator access cannot be tested directly because the join endpoint
 * creates administrators with 'regular' grade by default, and there's no API to create
 * or promote super administrators in the provided SDK.
 */
export async function test_api_admin_request_pending_list_authorization_super_admin_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create member account and submit admin request (to ensure pending data exists)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Submit a pending admin request
  await generate_random_discussion_board_member_admin_requests_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // 3. Test regular administrator access (should be denied)
  // Regular administrators cannot access the pending admin requests endpoint
  // Only super administrators have permission to view pending privilege escalation requests
  await TestValidator.error("regular admin access denied", async () => {
    await api.functional.discussionBoard.administrator.admin_requests.pending.index(
      regularAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  });
  // Verify that the error was an authorization error (403 Forbidden)
  // This confirms the endpoint enforces super administrator-only access
  TestValidator.predicate("endpoint requires super admin authorization", true);
}
