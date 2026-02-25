import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_admin_requests_create } from "../../../generate/generate_random_discussion_board_user_admin_requests_create";
import { generate_random_discussion_board_user_administrators_promote } from "../../../generate/generate_random_discussion_board_user_administrators_promote";
import { prepare_random_discussion_board_admin_hierarchy_action } from "../../../prepare/prepare_random_discussion_board_admin_hierarchy_action";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test successful administrator promotion workflow.
 *
 * Flow:
 * 1. Create super administrator account
 * 2. Create regular member account (promotion target)
 * 3. Target submits admin request with valid reason
 * 4. Super admin approves the admin request
 * 5. Super admin promotes the administrator to super admin
 * 6. Validate promotion result
 */
export async function test_api_administrator_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_user_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create regular member account (promotion target)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_user_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 3. Target submits admin request with valid reason (minimum 50 characters)
  const adminRequest =
    await api.functional.discussionBoard.user.adminRequests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 10,
          }) satisfies string & tags.MinLength<50>,
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. Super administrator approves the admin request
  const approvedRequest =
    await api.functional.discussionBoard.user.adminRequests.approve(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          reviewNotes: "Approved for promotion test",
        } satisfies IDiscussionBoardAdminRequest.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // 5. Super administrator promotes the administrator to super admin
  const promotedUser =
    await api.functional.discussionBoard.user.administrators.promote(
      superAdminConnection,
      {
        administratorId: member.id,
        body: {
          reason: "Promotion for successful test completion",
        } satisfies IDiscussionBoardAdminHierarchyAction.ICreate,
      },
    );
  typia.assert(promotedUser);
  // 6. Validate promotion result
  TestValidator.equals("promoted user id", promotedUser.id, member.id);
  TestValidator.equals(
    "display name preserved",
    promotedUser.displayName,
    member.displayName,
  );
}
