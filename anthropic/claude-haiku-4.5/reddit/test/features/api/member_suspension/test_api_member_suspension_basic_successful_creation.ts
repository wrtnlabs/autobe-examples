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
 * Test successful creation of a member suspension record by a moderator.
 *
 * This comprehensive test validates the workflow for suspending a member:
 *
 * - Creates moderator account for authorization
 * - Creates a category for community classification
 * - Creates a member account to be suspended
 * - Creates a moderation decision with suspend_user action
 * - Creates the member suspension record
 * - Verifies all suspension fields are correctly populated
 *
 * Steps:
 *
 * 1. Authenticate as moderator via join endpoint
 * 2. Authenticate as administrator to create category
 * 3. Create community category using administrator
 * 4. Create member account to be suspended
 * 5. Create moderation decision with suspend_user action
 * 6. Create member suspension record
 * 7. Validate suspension record has correct fields and values
 */
export async function test_api_member_suspension_basic_successful_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and store password for later use
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `mod_${RandomGenerator.alphaNumeric(8)}`,
      password: moderatorPassword,
      href: "https://example.com/auth/moderator/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create administrator account and store password for later use
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        password: adminPassword,
        name: RandomGenerator.name(),
        href: "https://example.com/auth/administrator/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 3: Create category using administrator context
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: `cat_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to moderator context by logging in
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Create a member account to be suspended and store password
  const suspendedMemberEmail = typia.random<string & tags.Format<"email">>();
  const suspendedMemberPassword = RandomGenerator.alphaNumeric(12);
  const suspendedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: suspendedMemberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: suspendedMemberPassword,
      href: "https://example.com/auth/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(suspendedMember);

  // Step 6: Create moderation decision with suspend_user action
  const suspensionDays = 7;
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy by posting offensive content and harassing other members",
          internal_notes:
            "Repeat offender - third violation in 30 days. Escalation recommended if continues.",
          suspension_duration_days: suspensionDays,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 7: Create member suspension record
  const suspensionStartTime = new Date().toISOString();
  const suspensionEndTime = new Date(
    Date.now() + suspensionDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: suspendedMember.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason:
            "Violation of community harassment policy. User engaged in personal attacks and threats towards other members. This temporary suspension is issued as part of graduated discipline. User may appeal within 7 days.",
          suspended_at: suspensionStartTime,
          expires_at: suspensionEndTime,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 8: Validate suspension record fields
  TestValidator.equals(
    "suspension member ID matches suspended member",
    suspension.community_platform_member_id,
    suspendedMember.id,
  );

  TestValidator.equals(
    "suspension decision ID matches created decision",
    suspension.community_platform_report_decision_id,
    decision.id,
  );

  TestValidator.predicate(
    "suspension reason is present and meets minimum length",
    suspension.suspension_reason.length >= 20,
  );

  TestValidator.predicate(
    "suspension has suspended_at timestamp",
    suspension.suspended_at !== null && suspension.suspended_at !== undefined,
  );

  TestValidator.predicate(
    "suspension has expires_at timestamp",
    suspension.expires_at !== null && suspension.expires_at !== undefined,
  );

  TestValidator.predicate(
    "suspension created_at timestamp is set",
    suspension.created_at !== null && suspension.created_at !== undefined,
  );

  TestValidator.predicate(
    "suspension updated_at timestamp is set",
    suspension.updated_at !== null && suspension.updated_at !== undefined,
  );

  TestValidator.predicate(
    "suspension deleted_at is null for active suspension",
    suspension.deleted_at === null || suspension.deleted_at === undefined,
  );
}
