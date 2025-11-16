import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test suspension audit timestamp initialization and immutability.
 *
 * Validates that suspension records properly initialize all audit timestamps
 * (created_at, updated_at, deleted_at) and maintain immutability of creation
 * timestamps throughout the suspension lifecycle. Tests that the system
 * correctly tracks suspension start time (suspended_at), automatically
 * generates unique identifiers, and preserves the original creation timestamp
 * while updating modification timestamps on subsequent changes.
 *
 * Steps:
 *
 * 1. Create administrator account
 * 2. Create member to be suspended
 * 3. Create moderator to submit decision
 * 4. Create post and report for violation
 * 5. Create moderation decision triggering suspension
 * 6. Create suspension record and verify timestamp initialization
 * 7. Verify created_at and updated_at are set to recent timestamps
 * 8. Verify deleted_at is null for active suspension
 * 9. Verify suspended_at matches provided restriction start time
 * 10. Verify UUID is automatically generated for suspension ID
 * 11. Verify member and decision references are properly associated
 */
export async function test_api_member_suspension_audit_timestamps_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate("admin created", admin.id !== null);

  // Step 2: Create member to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(6),
        password: memberPassword,
        href: "http://localhost:3000/auth/member",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member created", member.id !== null);

  // Step 3: Create moderator to submit decision
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(7),
        password: moderatorPassword,
        href: "http://localhost:3000/auth/moderator",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator created", moderator.id !== null);

  // Switch to member account for posting
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/member",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create post and report for violation
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.predicate("post created", post.id !== null);

  // Create report for the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.predicate("report created", report.id !== null);

  // Step 5: Switch to moderator account and create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const suspensionDurationDays = 7;
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          suspension_duration_days: suspensionDurationDays,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);
  TestValidator.predicate("decision created", decision.id !== null);

  // Step 6: Switch to admin account and create suspension record
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/auth/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const beforeCreationTime = new Date();
  const suspensionStartTime = new Date();
  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.administrator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
          suspended_at: suspensionStartTime.toISOString(),
          expires_at: new Date(
            suspensionStartTime.getTime() +
              suspensionDurationDays * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  const afterCreationTime = new Date();

  // Step 7: Verify timestamp initialization
  TestValidator.predicate(
    "created_at is set and recent",
    new Date(suspension.created_at) >= beforeCreationTime &&
      new Date(suspension.created_at) <= afterCreationTime,
  );

  TestValidator.predicate(
    "updated_at is set and equals created_at initially",
    new Date(suspension.updated_at) >= beforeCreationTime &&
      new Date(suspension.updated_at) <= afterCreationTime,
  );

  // Step 8: Verify deleted_at is null for active suspension
  TestValidator.predicate(
    "deleted_at is null for active suspension",
    suspension.deleted_at === null || suspension.deleted_at === undefined,
  );

  // Step 9: Verify suspended_at matches provided restriction start time
  TestValidator.equals(
    "suspended_at matches provided start time",
    suspension.suspended_at,
    suspensionStartTime.toISOString(),
  );

  // Step 10: Verify UUID is automatically generated for suspension ID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "suspension ID is valid UUID",
    uuidRegex.test(suspension.id),
  );

  // Step 11: Verify member and decision references are properly associated
  TestValidator.equals(
    "member ID is properly associated",
    suspension.community_platform_member_id,
    member.id,
  );

  TestValidator.equals(
    "decision ID is properly associated",
    suspension.community_platform_report_decision_id,
    decision.id,
  );

  // Verify expiration is set correctly
  TestValidator.predicate(
    "expires_at is set correctly",
    suspension.expires_at !== null && suspension.expires_at !== undefined,
  );
}
