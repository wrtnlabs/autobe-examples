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

export async function test_api_moderation_appeal_status_transition_to_in_review(
  connection: api.IConnection,
) {
  // Test transitioning a moderation appeal from 'submitted' status to 'in_review' status
  // by assigning an independent reviewer. Validates that the assigned reviewer must be
  // different from the original decision moderator, and that appeal_status transitions
  // correctly while appeal_reviewer_id is properly populated.

  // Step 1: Create member to submit appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "http://localhost:3000/auth/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create first moderator (original decision maker)
  const mod1Email = typia.random<string & tags.Format<"email">>();
  const mod1Password = RandomGenerator.alphaNumeric(12);
  const mod1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: mod1Email,
        username: RandomGenerator.alphabets(8),
        password: mod1Password,
        href: "http://localhost:3000/auth/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(mod1);

  // Step 3: Create second moderator (independent reviewer)
  const mod2Email = typia.random<string & tags.Format<"email">>();
  const mod2Password = RandomGenerator.alphaNumeric(12);
  const mod2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: mod2Email,
        username: RandomGenerator.alphabets(8),
        password: mod2Password,
        href: "http://localhost:3000/auth/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(mod2);

  // Step 4: Switch to mod1 authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod1Email,
      password: mod1Password,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Create a moderation decision with mod1 as the original decision maker
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason:
            "Content violates community standards regarding harassment and personal attacks",
          internal_notes:
            "Clear violation of policy, user has history of similar violations",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 6: Switch to member authentication and create an appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe the content removal was unjust. I was providing factual information in response to misinformation and should not have been penalized",
          supporting_evidence: "http://localhost:3000/evidence/appeal-context",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 7: Verify initial appeal status is 'submitted'
  TestValidator.equals(
    "appeal initial status should be submitted",
    appeal.appeal_status,
    "submitted",
  );
  TestValidator.predicate(
    "appeal_reviewer_id should be null initially",
    appeal.appeal_reviewer_id === null ||
      appeal.appeal_reviewer_id === undefined,
  );

  // Step 8: Switch to mod2 authentication to assign as reviewer
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: mod2Email,
      password: mod2Password,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 9: Update appeal to transition to 'in_review' with mod2 as reviewer
  const updatedAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderator.moderationAppeals.update(
      connection,
      {
        appealId: appeal.id,
        body: {
          appeal_status: "in_review",
          appeal_reviewer_id: mod2.id,
        } satisfies ICommunityPlatformModerationAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);

  // Step 10: Verify status transition to 'in_review'
  TestValidator.equals(
    "appeal status should transition to in_review",
    updatedAppeal.appeal_status,
    "in_review",
  );

  // Step 11: Verify reviewer is assigned correctly
  TestValidator.equals(
    "appeal_reviewer_id should match assigned moderator",
    updatedAppeal.appeal_reviewer_id,
    mod2.id,
  );

  // Step 12: Verify reviewer is different from original decision moderator
  TestValidator.notEquals(
    "assigned reviewer should be different from original moderator",
    updatedAppeal.appeal_reviewer_id,
    decision.moderator.id,
  );

  // Step 13: Verify reviewer information is populated
  TestValidator.predicate(
    "reviewer object should be populated after assignment",
    updatedAppeal.reviewer !== null && updatedAppeal.reviewer !== undefined,
  );

  if (updatedAppeal.reviewer) {
    TestValidator.equals(
      "reviewer id should match appeal_reviewer_id",
      updatedAppeal.reviewer.id,
      mod2.id,
    );
  }

  // Step 14: Verify complete appeal record contains all expected information
  TestValidator.predicate(
    "appeal should have submitted_at timestamp",
    updatedAppeal.submitted_at !== null &&
      updatedAppeal.submitted_at !== undefined,
  );

  TestValidator.predicate(
    "appeal should have correct appellant",
    updatedAppeal.appellant.id === member.id,
  );

  TestValidator.predicate(
    "appeal should reference correct decision",
    updatedAppeal.decision.id === decision.id,
  );
}
