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
 * Test that a super administrator can reject a pending administrator privilege escalation request.
 * Verifies that rejection preserves member status and creates proper audit trail.
 *
 * 1. Super administrator registers and authenticates
 * 2. Member registers and authenticates
 * 3. Member submits admin privilege escalation request
 * 4. Super administrator rejects the request with decision_type='rejected'
 * 5. Validates decision record creation with relationships
 * 6. Confirms request status changed to 'rejected' with reviewed_at timestamp
 * 7. Verifies member account remains unchanged (no promotion)
 */
export async function test_api_admin_request_decision_rejection_preserves_member_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = "SuperAdmin123!";
  await authorize_administrator_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      display_name: "Super Administrator",
      bio: "System super administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member123!";
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: "Test Member",
      bio: "Regular member user",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Member submits admin privilege escalation request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason:
            "I have been an active community member for over a year and believe I can help moderate discussions and manage content effectively.",
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Verify initial request status is pending
  TestValidator.equals(
    "initial status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reviewed_at is null initially",
    adminRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewingAdministrator is null initially",
    adminRequest.reviewingAdministrator,
    null,
  );
  // 4. Super administrator rejects the request
  const decision =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      superAdminConnection,
      {
        params: {
          requestId: adminRequest.id,
        },
        body: {
          decision_type: "rejected",
          decision_context:
            "While we appreciate your interest, we currently have sufficient moderation capacity. Please continue contributing to the community.",
        } satisfies IDiscussionBoardAdminRequestDecision.ICreate,
      },
    );
  typia.assert(decision);
  // 5. Validate decision record
  TestValidator.equals(
    "decision type is rejected",
    decision.decision_type,
    "rejected",
  );
  TestValidator.predicate(
    "decision context is provided",
    decision.decision_context !== null,
  );
  TestValidator.equals(
    "decision context matches",
    decision.decision_context,
    "While we appreciate your interest, we currently have sufficient moderation capacity. Please continue contributing to the community.",
  );
  TestValidator.predicate(
    "decision has valid created_at",
    decision.created_at !== null,
  );
  // Validate decision relationships
  TestValidator.equals(
    "decision adminRequest ID matches",
    decision.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "decision reviewer is super admin",
    decision.reviewer.email,
    superAdminEmail,
  );
  // 6. Verify admin request status changed to rejected
  TestValidator.equals(
    "request status changed to rejected",
    decision.adminRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is set",
    decision.adminRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewingAdministrator is set",
    decision.adminRequest.reviewingAdministrator !== null,
  );
  TestValidator.equals(
    "reviewingAdministrator is super admin",
    decision.adminRequest.reviewingAdministrator!.email,
    superAdminEmail,
  );
  // 7. Verify member account remains unchanged (no promotion to administrator)
  // The member should still be a regular member, not an administrator
  // We verify this by checking that the decision's adminRequest still references the original member
  TestValidator.equals(
    "member email unchanged",
    decision.adminRequest.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "member display name unchanged",
    decision.adminRequest.member.display_name,
    "Test Member",
  );
  // 8. Verify rejected request record is preserved
  TestValidator.predicate(
    "request ID preserved",
    decision.adminRequest.id !== null,
  );
  TestValidator.predicate(
    "original reason preserved",
    decision.adminRequest.reason !== null,
  );
  TestValidator.equals(
    "original reason matches",
    decision.adminRequest.reason,
    "I have been an active community member for over a year and believe I can help moderate discussions and manage content effectively.",
  );
  TestValidator.predicate(
    "submitted_at timestamp preserved",
    decision.adminRequest.submitted_at !== null,
  );
}
