import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test that the system prevents assigning the original decision moderator as
 * the appeal reviewer.
 *
 * Validates the conflict of interest prevention mechanism by:
 *
 * 1. Creating member and moderator accounts for testing
 * 2. Creating an initial moderation decision on a report
 * 3. Submitting an appeal against that decision
 * 4. Attempting to assign the original decision moderator as reviewer (should
 *    fail)
 * 5. Successfully assigning a different moderator as reviewer
 *
 * This ensures independent review of appeals and prevents moderators from
 * reviewing their own decisions.
 *
 * Steps:
 *
 * 1. Register member and moderator accounts
 * 2. Create a report and decision with first moderator
 * 3. Submit appeal as member
 * 4. Try assigning first moderator as reviewer (expect error)
 * 5. Assign second moderator as reviewer (expect success)
 * 6. Verify appeal status transitioned correctly
 */
export async function test_api_moderation_appeal_update_reviewer_conflict_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(),
      password: "SecurePass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create first moderator (original decision maker)
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.name(),
      password: "SecurePass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  // Step 3: Create second moderator (for appeal review)
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.name(),
      password: "SecurePass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // Step 4: Authenticate as moderator1 to create a report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: "SecurePass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Create moderation decision as moderator1
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community standards regarding harassment and personal attacks with detailed explanation of why this content was removed",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Switch to member to submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "SecurePass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Submit appeal
  const appeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "The content was educational and not a personal attack. The moderator misinterpreted the context and the overall discussion thread.",
          supporting_evidence: "https://example.com/context-link",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal created with submitted status",
    appeal.appeal_status,
    "submitted",
  );

  // Step 8: Switch to moderator1 and attempt to assign themselves as reviewer (should fail)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: "SecurePass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Attempt to assign original moderator as reviewer - should error
  await TestValidator.error(
    "assigning original decision moderator as reviewer should fail with conflict error",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "in_review",
            appeal_reviewer_id: moderator1.id,
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Step 9: Switch to moderator2 to properly assign as reviewer
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: "SecurePass123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 10: Assign different moderator as reviewer (should succeed)
  const updatedAppeal =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          appeal_status: "in_review",
          appeal_reviewer_id: moderator2.id,
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);

  // Step 11: Validate appeal transitioned to in_review with correct reviewer
  TestValidator.equals(
    "appeal status transitioned to in_review",
    updatedAppeal.appeal_status,
    "in_review",
  );
  TestValidator.equals(
    "reviewer assigned is moderator2",
    updatedAppeal.reviewer?.id,
    moderator2.id,
  );
  TestValidator.notEquals(
    "reviewer is different from original decision moderator",
    updatedAppeal.reviewer?.id,
    moderator1.id,
  );
}
