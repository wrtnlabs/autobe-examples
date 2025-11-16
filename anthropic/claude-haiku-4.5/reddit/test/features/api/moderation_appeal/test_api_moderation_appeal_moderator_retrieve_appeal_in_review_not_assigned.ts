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

export async function test_api_moderation_appeal_moderator_retrieve_appeal_in_review_not_assigned(
  connection: api.IConnection,
) {
  // Register member (appellant) who will submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Register original decision moderator
  const decisionModeratorEmail = typia.random<string & tags.Format<"email">>();
  const decisionModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: decisionModeratorEmail,
        username: RandomGenerator.name(1),
        password: "ModeratorPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(decisionModerator);

  // Register reviewer moderator (who will be assigned to review)
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewer: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: reviewerEmail,
        username: RandomGenerator.name(1),
        password: "ReviewerPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(reviewer);

  // Register unauthorized moderator (should not have access)
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorized: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: unauthorizedEmail,
        username: RandomGenerator.name(1),
        password: "UnauthorizedPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(unauthorized);

  // Switch to decision moderator to create report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: decisionModeratorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a report decision
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "issue_warning",
          reason:
            "Content violates community standards with multiple policy violations requiring formal notification.",
          internal_notes:
            "Repeat offender pattern detected in recent activity.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Switch to member context and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const appeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.member.moderationAppeals.create(
      connection,
      {
        body: {
          community_platform_report_decision_id: decision.id,
          appeal_reason:
            "I believe this decision was incorrect because the content was taken out of context and does not violate the community standards as described.",
          supporting_evidence: "https://example.com/context/evidence",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Switch to unauthorized moderator and attempt to retrieve the in-review appeal
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: unauthorizedEmail,
      password: "UnauthorizedPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Attempt to retrieve appeal - unauthorized moderators should not be able to view
  // appeals in 'in_review' status if not assigned as the reviewer
  await TestValidator.error(
    "unauthorized moderator cannot retrieve in_review appeal not assigned to them",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAppeals.at(
        connection,
        {
          appealId: appeal.id,
        },
      );
    },
  );
}
