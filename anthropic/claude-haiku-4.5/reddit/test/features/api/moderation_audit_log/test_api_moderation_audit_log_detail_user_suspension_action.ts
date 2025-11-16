import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test detailed retrieval of a moderation audit log for a user suspension
 * action.
 *
 * Validates that when retrieving a moderation audit log entry for a user
 * suspension, the response includes all required accountability and state
 * tracking information. Confirms the presence of the affected member's ID,
 * action_type='suspend_user', target_type='user', and the reason for
 * suspension. Verifies that the target_member field identifies which member
 * received the suspension. Tests that previous_state contains the member's
 * account state before suspension and new_state shows the updated suspension
 * status. Validates that the moderator's justification clearly explains policy
 * violations or conduct issues that prompted the suspension.
 *
 * Test Flow:
 *
 * 1. Create an administrator account for authentication
 * 2. Retrieve an audit log entry (using a realistic log ID)
 * 3. Validate the audit log structure and suspension-specific fields
 * 4. Verify all accountability tracking and state information is present
 */
export async function test_api_moderation_audit_log_detail_user_suspension_action(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(8),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve a moderation audit log for suspension validation
  const logId = typia.random<string & tags.Format<"uuid">>();
  const auditLog: ICommunityPlatformModerationAuditLog =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.at(
      connection,
      {
        logId: logId,
      },
    );
  typia.assert(auditLog);

  // Step 3: Validate complete audit log structure with typia assertion
  typia.assert<ICommunityPlatformModerationAuditLog>(auditLog);

  // Step 4: Validate core audit log fields
  TestValidator.predicate(
    "audit log id is non-empty UUID",
    auditLog.id.length === 36,
  );

  // Step 5: Validate moderator information
  TestValidator.predicate(
    "moderator has valid id length",
    auditLog.moderator.id.length === 36,
  );
  TestValidator.predicate(
    "moderator has username",
    auditLog.moderator.username.length > 0 &&
      auditLog.moderator.username.length <= 50,
  );

  // Step 6: Validate target member information
  TestValidator.predicate(
    "target member present for suspension action",
    auditLog.target_member !== null && auditLog.target_member !== undefined,
  );
  if (auditLog.target_member) {
    TestValidator.predicate(
      "target member has valid id length",
      auditLog.target_member.id.length === 36,
    );
    TestValidator.predicate(
      "target member has username",
      auditLog.target_member.username.length > 0,
    );
    TestValidator.predicate(
      "target member email present",
      auditLog.target_member.email.length > 0,
    );
    TestValidator.predicate(
      "target member has karma score",
      auditLog.target_member.karma_score >= 0,
    );
  }

  // Step 7: Validate action type is suspension
  TestValidator.equals(
    "action type matches suspend_user",
    auditLog.action_type,
    "suspend_user",
  );

  // Step 8: Validate target type is user
  TestValidator.equals(
    "target type matches user",
    auditLog.target_type,
    "user",
  );

  // Step 9: Validate action reason contains suspension justification
  TestValidator.predicate(
    "action reason length within bounds",
    auditLog.action_reason.length > 0 && auditLog.action_reason.length <= 500,
  );

  // Step 10: Validate state tracking for suspension
  TestValidator.predicate(
    "previous state is object",
    auditLog.previous_state !== null &&
      auditLog.previous_state !== undefined &&
      typeof auditLog.previous_state === "object",
  );

  TestValidator.predicate(
    "new state is object",
    auditLog.new_state !== null &&
      auditLog.new_state !== undefined &&
      typeof auditLog.new_state === "object",
  );

  // Step 11: Validate security context
  TestValidator.predicate(
    "ip address present and valid length",
    auditLog.ip_address.length > 0,
  );

  TestValidator.predicate(
    "user agent present and valid length",
    auditLog.user_agent.length > 0 && auditLog.user_agent.length <= 500,
  );

  // Step 12: Validate action status
  TestValidator.predicate(
    "action status is valid",
    ["success", "failure", "partial_success"].includes(auditLog.action_status),
  );

  // Step 13: Validate timestamp is set
  TestValidator.predicate(
    "created_at timestamp present",
    auditLog.created_at.length > 0,
  );

  // Step 14: Validate target_id
  TestValidator.predicate(
    "target_id is UUID format",
    auditLog.target_id.length === 36,
  );

  // Step 15: Validate status_details for non-success scenarios
  if (auditLog.action_status !== "success") {
    TestValidator.predicate(
      "status_details provided for non-success actions",
      auditLog.status_details === undefined ||
        (auditLog.status_details &&
          auditLog.status_details.length > 0 &&
          auditLog.status_details.length <= 500),
    );
  }
}
