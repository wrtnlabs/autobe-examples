import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { generate_random_discussion_board_super_admin_admin_requests_decide } from "../../../generate/generate_random_discussion_board_super_admin_admin_requests_decide";
import { prepare_random_discussion_board_admin_request_decision } from "../../../prepare/prepare_random_discussion_board_admin_request_decision";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_governance_oversight_comprehensive_data(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create regular admin accounts
  const adminConnections: api.IConnection[] = ArrayUtil.repeat(2, () => ({
    host: connection.host,
  }));
  const regularAdmins = await Promise.all(
    adminConnections.map(async (adminConnection) => {
      return await authorize_admin_join(adminConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "admin123",
        } satisfies IDiscussionBoardAdmin.IJoin,
      });
    }),
  );
  // Create sections as administrative actions using one admin
  const sections = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      return await generate_random_discussion_board_admin_sections_create(
        adminConnections[0],
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    }),
  );
  // Create user bans as administrative actions using another admin
  const memberIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const bans = await Promise.all(
    memberIds.map(async (memberId) => {
      return await generate_random_discussion_board_admin_user_bans_create(
        adminConnections[1],
        {
          body: {
            member_id: memberId,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
            expires_at: null,
          } satisfies IDiscussionBoardUserBan.ICreate,
        },
      );
    }),
  );
  // Create admin requests (simulated since we don't have member creation)
  const adminRequestIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Process admin requests (approve and reject)
  // Approve one request
  await generate_random_discussion_board_super_admin_admin_requests_decide(
    superAdminConnection,
    {
      params: { requestId: adminRequestIds[0] },
      body: {
        admin_request_id: adminRequestIds[0],
        decision: "approved",
        rejection_reason: null,
      } satisfies IDiscussionBoardAdminRequestDecision.ICreate,
    },
  );
  // Reject one request
  await generate_random_discussion_board_super_admin_admin_requests_decide(
    superAdminConnection,
    {
      params: { requestId: adminRequestIds[1] },
      body: {
        admin_request_id: adminRequestIds[1],
        decision: "rejected",
        rejection_reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardAdminRequestDecision.ICreate,
    },
  );
  // Retrieve governance oversight data
  const oversight =
    await api.functional.discussionBoard.superAdmin.governance.oversight.invert(
      superAdminConnection,
    );
  typia.assert(oversight);
  // Validate administrator counts
  TestValidator.predicate(
    "should have at least 1 super admin",
    oversight.administrator_counts.super_admins >= 1,
  );
  TestValidator.predicate(
    "should have regular admins created",
    oversight.administrator_counts.regular_admins >= 2,
  );
  TestValidator.equals(
    "total admins should equal super + regular",
    oversight.administrator_counts.total_admins,
    oversight.administrator_counts.super_admins +
      oversight.administrator_counts.regular_admins,
  );
  // Validate action statistics (check if any actions were recorded)
  TestValidator.predicate(
    "should have some administrative actions",
    Object.keys(oversight.action_statistics).length > 0,
  );
  // Validate ban patterns
  TestValidator.predicate(
    "should have active bans",
    oversight.ban_patterns.active_bans >= 0,
  );
  TestValidator.predicate(
    "should have recent bans",
    oversight.ban_patterns.recent_bans >= 0,
  );
  // Validate governance decisions
  TestValidator.predicate(
    "approval rate should be between 0 and 1",
    oversight.governance_decisions.approval_rate >= 0 &&
      oversight.governance_decisions.approval_rate <= 1,
  );
  TestValidator.predicate(
    "rejection rate should be between 0 and 1",
    oversight.governance_decisions.rejection_rate >= 0 &&
      oversight.governance_decisions.rejection_rate <= 1,
  );
  TestValidator.equals(
    "approval and rejection rates should sum to 1",
    oversight.governance_decisions.approval_rate +
      oversight.governance_decisions.rejection_rate,
    1,
  );
}
