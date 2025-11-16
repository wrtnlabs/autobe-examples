import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";

/**
 * Test emergency suspension capabilities where an administrator can quickly
 * suspend a member for platform security or immediate policy violation reasons.
 * This tests rapid response scenarios where an administrator needs to
 * immediately restrict member access without waiting for community moderator
 * investigation. The test validates quick suspension creation with appropriate
 * reason documentation and proper audit trail for the emergency action. This
 * tests the graduated discipline system at the administrative level.
 *
 * Workflow:
 *
 * 1. Administrator signs up and authenticates
 * 2. Create a member suspension with emergency reason documentation
 * 3. Validate suspension record is created with correct timestamps and fields
 * 4. Verify audit trail is properly established
 */
export async function test_api_member_suspension_administrator_emergency_suspension(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication and registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminSecurePassword123",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://platform.example.com/admin/emergency",
        referrer: "https://platform.example.com/admin",
        ip: "192.168.1.100",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  TestValidator.equals(
    "administrator email matches registration",
    administrator.email,
    adminEmail,
  );
  TestValidator.equals(
    "administrator account status is active",
    administrator.account_status,
    "active",
  );
  TestValidator.predicate(
    "administrator has valid access token",
    administrator.token.access.length > 0,
  );

  // Step 2: Create emergency member suspension record
  const suspendedMemberId = typia.random<string & tags.Format<"uuid">>();
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();

  const suspensionReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 3,
    wordMax: 8,
  });

  const now = new Date();
  const suspensionStartTime = now.toISOString();
  const suspensionEndTime = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: suspendedMemberId,
          community_platform_report_decision_id: reportDecisionId,
          suspension_reason: suspensionReason,
          suspended_at: suspensionStartTime,
          expires_at: suspensionEndTime,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 3: Validate suspension record structure and content
  TestValidator.equals(
    "suspension member ID matches request",
    suspension.community_platform_member_id,
    suspendedMemberId,
  );
  TestValidator.equals(
    "suspension decision ID matches request",
    suspension.community_platform_report_decision_id,
    reportDecisionId,
  );
  TestValidator.equals(
    "suspension reason matches request",
    suspension.suspension_reason,
    suspensionReason,
  );
  TestValidator.equals(
    "suspension start time matches request",
    suspension.suspended_at,
    suspensionStartTime,
  );
  TestValidator.equals(
    "suspension expiration time matches request",
    suspension.expires_at,
    suspensionEndTime,
  );

  // Step 4: Verify audit trail timestamps
  TestValidator.predicate(
    "suspension created_at timestamp is set",
    suspension.created_at !== null && suspension.created_at !== undefined,
  );
  TestValidator.predicate(
    "suspension updated_at timestamp is set",
    suspension.updated_at !== null && suspension.updated_at !== undefined,
  );
  TestValidator.predicate(
    "suspension not deleted at creation",
    suspension.deleted_at === null || suspension.deleted_at === undefined,
  );
}
