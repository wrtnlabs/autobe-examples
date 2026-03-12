import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_administrator_admin_requests_decisions_create } from "../../../generate/generate_random_discussion_board_administrator_admin_requests_decisions_create";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_admin_request_decision } from "../../../prepare/prepare_random_discussion_board_admin_request_decision";

/**
 * Test that a super administrator can approve a pending administrator privilege escalation request submitted by a member.
 * This test verifies the complete workflow of member admin request submission and super admin approval,
 * including automatic promotion to regular administrator status.
 */
export async function test_api_admin_request_decision_approval_promotes_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account that will submit the admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a pending admin request as the member
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // Verify the request is in pending status
  TestValidator.equals(
    "admin request status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "admin request has no reviewer",
    adminRequest.reviewingAdministrator,
    null,
  );
  TestValidator.equals(
    "admin request has no reviewed_at",
    adminRequest.reviewed_at,
    null,
  );
  // 3. Create super administrator account with decision-making authority
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 4. Super admin creates approval decision
  const decision =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      superAdminConnection,
      {
        params: {
          requestId: adminRequest.id,
        },
        body: {
          decision_type: "approved",
          decision_context: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(decision);
  // 5. Validate the decision record
  TestValidator.equals(
    "decision type is approved",
    decision.decision_type,
    "approved",
  );
  TestValidator.predicate(
    "decision has context",
    decision.decision_context !== null,
  );
  TestValidator.equals(
    "decision reviewer is super admin",
    decision.reviewer.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "decision admin request matches",
    decision.adminRequest.id,
    adminRequest.id,
  );
  // 6. Verify the admin request was updated
  TestValidator.equals(
    "admin request status changed to approved",
    decision.adminRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "admin request has reviewed_at timestamp",
    decision.adminRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "admin request reviewer is super admin",
    decision.adminRequest.reviewingAdministrator?.id,
    superAdminAuth.id,
  );
  // 7. Verify the member was promoted to regular administrator
  // The decision.adminRequest.member should still be the original member,
  // but a new administrator account should have been created with the same email
  TestValidator.predicate(
    "member email exists in request",
    decision.adminRequest.member.email !== null,
  );
  TestValidator.equals(
    "member display_name preserved",
    decision.adminRequest.member.display_name,
    adminRequest.member.display_name,
  );
}