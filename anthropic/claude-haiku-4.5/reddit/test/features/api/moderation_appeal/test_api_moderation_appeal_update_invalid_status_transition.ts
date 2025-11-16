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

export async function test_api_moderation_appeal_update_invalid_status_transition(
  connection: api.IConnection,
) {
  // Setup: Create member and moderators for the appeal process
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create first moderator for initial decision
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.name(),
      password: "ModPassword123!",
      href: "https://example.com/mod-register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  // Create second moderator for appeal review
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.name(),
      password: "ModPassword123!",
      href: "https://example.com/mod-register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // Create third moderator for additional appeal review
  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator3Email,
      username: RandomGenerator.name(),
      password: "ModPassword123!",
      href: "https://example.com/mod-register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator3);

  // Create report decision with valid reportId
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with persistent attacks",
          internal_notes: "Third violation in 30 days",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Create appeal
  const appeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "The moderation decision was unfair and did not consider the context of the conversation. I was defending myself against false accusations.",
          supporting_evidence: "https://example.com/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal initial status is submitted",
    appeal.appeal_status,
    "submitted",
  );

  // Test 1: Invalid transition - submitted directly to approved (skipping in_review)
  await TestValidator.error(
    "should reject transition from submitted directly to approved",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "approved",
            appeal_outcome: "overturned_restore_content",
            appeal_reviewer_id: moderator2.id,
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Test 2: Invalid transition - submitted directly to denied (skipping in_review)
  await TestValidator.error(
    "should reject transition from submitted directly to denied",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "denied",
            appeal_outcome: "decision_upheld",
            appeal_reviewer_id: moderator2.id,
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Test 3: Invalid transition - submitted directly to reduced (skipping in_review)
  await TestValidator.error(
    "should reject transition from submitted directly to reduced",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "reduced",
            appeal_outcome: "suspension_reduced_to_warning",
            appeal_reviewer_id: moderator2.id,
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Valid transition: submitted to in_review
  const appealInReview =
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
  typia.assert(appealInReview);
  TestValidator.equals(
    "appeal status is now in_review",
    appealInReview.appeal_status,
    "in_review",
  );

  // Test 4: Invalid transition - in_review back to submitted (backwards)
  await TestValidator.error(
    "should reject backwards transition from in_review to submitted",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "submitted",
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Valid transition: in_review to approved
  const appealApproved =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          appeal_status: "approved",
          appeal_outcome: "overturned_restore_content",
          reviewer_notes:
            "Upon review, the original decision was not properly justified and the context was misunderstood.",
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(appealApproved);
  TestValidator.equals(
    "appeal status is now approved",
    appealApproved.appeal_status,
    "approved",
  );

  // Test 5: Invalid transition - approved back to in_review (backwards)
  await TestValidator.error(
    "should reject backwards transition from approved to in_review",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "in_review",
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Test 6: Invalid transition - approved back to submitted (backwards)
  await TestValidator.error(
    "should reject backwards transition from approved to submitted",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal.id,
          body: {
            appeal_status: "submitted",
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Create another appeal for testing denied state
  const reportId2 = typia.random<string & tags.Format<"uuid">>();
  const decision2 =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId2,
        body: {
          action_type: "issue_warning",
          reason: "User violated community guidelines",
          internal_notes: "First violation",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision2);

  const appeal2 =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision2.id,
          appeal_reason:
            "I believe this decision was too harsh and not proportional to the violation.",
          supporting_evidence: "https://example.com/evidence2",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal2);

  // Transition appeal2 to in_review then denied
  const appeal2InReview =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal2.id,
        body: {
          appeal_status: "in_review",
          appeal_reviewer_id: moderator3.id,
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(appeal2InReview);

  const appeal2Denied =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal2.id,
        body: {
          appeal_status: "denied",
          appeal_outcome: "decision_upheld",
          reviewer_notes:
            "The original decision was appropriate and well-justified.",
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(appeal2Denied);
  TestValidator.equals(
    "appeal status is now denied",
    appeal2Denied.appeal_status,
    "denied",
  );

  // Test 7: Invalid transition - denied back to in_review (backwards)
  await TestValidator.error(
    "should reject backwards transition from denied to in_review",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal2.id,
          body: {
            appeal_status: "in_review",
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );

  // Test 8: Invalid transition - denied back to submitted (backwards)
  await TestValidator.error(
    "should reject backwards transition from denied to submitted",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.update(
        connection,
        {
          appealId: appeal2.id,
          body: {
            appeal_status: "submitted",
          } satisfies ICommunityPlatformModerationAppeal.IUpdate,
        },
      );
    },
  );
}
