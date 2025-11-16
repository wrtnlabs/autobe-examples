import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test member suspension creation without expiration date (permanent
 * suspension).
 *
 * Validates that a moderator can create an indefinite suspension by omitting
 * the expires_at field, resulting in a null value. This tests the scenario
 * where a member receives a permanent suspension without automatic expiration.
 * Verifies that the suspension_reason clearly explains why a permanent
 * suspension was chosen and that expires_at is properly set to null. Tests the
 * audit trail showing the moderator's decision to impose permanent
 * restrictions.
 *
 * Workflow:
 *
 * 1. Create moderator account
 * 2. Create member account (to be suspended)
 * 3. Create permanent member suspension with null expires_at
 * 4. Validate suspension details and permanent status
 */
export async function test_api_member_suspension_permanent_no_expiration(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8).toLowerCase(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Switch to moderator context
  connection.headers ??= {};
  connection.headers.Authorization = moderator.token.access;

  // 2. Create member account (to be suspended)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8).toLowerCase(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create permanent member suspension with null expires_at
  // Using generated UUIDs for report decision reference
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date().toISOString();

  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: reportDecisionId,
          suspension_reason:
            "Permanent suspension: User violated community harassment policy and engaged in targeted intimidation of other members. This suspension is indefinite without automatic expiration.",
          suspended_at: now,
          expires_at: null,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // 4. Validate suspension details and permanent status
  TestValidator.equals(
    "suspended member ID matches",
    suspension.community_platform_member_id,
    member.id,
  );

  TestValidator.predicate(
    "suspension reason is substantive and explains permanent status",
    suspension.suspension_reason.length >= 20 &&
      suspension.suspension_reason.includes("permanent"),
  );

  TestValidator.predicate(
    "expires_at is null for permanent suspension",
    suspension.expires_at === null,
  );

  TestValidator.equals(
    "report decision reference matches",
    suspension.community_platform_report_decision_id,
    reportDecisionId,
  );

  // Validate timestamps are in ISO 8601 format
  TestValidator.predicate(
    "suspended_at is valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.suspended_at),
  );

  // Validate that the suspension was created successfully with required fields
  TestValidator.predicate(
    "suspension has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      suspension.id,
    ),
  );

  // Verify created_at timestamp is present and valid
  TestValidator.predicate(
    "created_at timestamp is present",
    suspension.created_at.length > 0,
  );

  // Verify updated_at timestamp is present and valid
  TestValidator.predicate(
    "updated_at timestamp is present",
    suspension.updated_at.length > 0,
  );

  // Verify soft-delete timestamp is null for active suspension
  TestValidator.predicate(
    "deleted_at is null for active suspension",
    suspension.deleted_at === null || suspension.deleted_at === undefined,
  );
}
