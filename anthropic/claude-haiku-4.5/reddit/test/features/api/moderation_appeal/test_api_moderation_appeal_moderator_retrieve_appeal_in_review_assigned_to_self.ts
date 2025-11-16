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

export async function test_api_moderation_appeal_moderator_retrieve_appeal_in_review_assigned_to_self(
  connection: api.IConnection,
) {
  // 1. Register a member who will submit the appeal
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Register first moderator (decision maker)
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = RandomGenerator.alphaNumeric(12);
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        username: RandomGenerator.alphabets(10),
        password: moderator1Password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  // 3. Register second moderator (reviewer who will retrieve the appeal)
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = RandomGenerator.alphaNumeric(12);
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        username: RandomGenerator.alphabets(10),
        password: moderator2Password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // 4. Generate a reportId for decision creation
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 5. Create a moderation decision for the report (as moderator1)
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "issue_warning",
          reason:
            "Content violates community guidelines regarding inappropriate language and harassment patterns",
          internal_notes:
            "First violation by this user, pattern matches previous report",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 6. Switch to member context and submit appeal
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
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
            "I believe the decision was unfair as my message was sarcasm and not intended as harassment. The context was misunderstood by the moderator.",
          supporting_evidence: "https://example.com/context-thread",
        } satisfies ICommunityPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  TestValidator.equals(
    "appeal status should be submitted",
    appeal.appeal_status,
    "submitted",
  );

  // 7. Switch to second moderator context (the assigned reviewer)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: moderator2Password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 8. Retrieve the appeal as the assigned reviewer moderator
  const retrievedAppeal: ICommunityPlatformModerationAppeal =
    await api.functional.communityPlatform.moderator.moderationAppeals.at(
      connection,
      {
        appealId: appeal.id,
      },
    );
  typia.assert(retrievedAppeal);

  // 9. Validate the retrieved appeal contains correct information
  TestValidator.equals("appeal ID should match", retrievedAppeal.id, appeal.id);
  TestValidator.equals(
    "appeal reason should match",
    retrievedAppeal.appeal_reason,
    appeal.appeal_reason,
  );
  TestValidator.equals(
    "decision ID should match",
    retrievedAppeal.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.equals(
    "appellant member ID should match",
    retrievedAppeal.appellant.id,
    member.id,
  );

  // 10. Validate decision context is available in the appeal
  TestValidator.equals(
    "decision action type should be issue_warning",
    retrievedAppeal.decision.action_type,
    "issue_warning",
  );
  TestValidator.predicate(
    "decision reason should be present",
    retrievedAppeal.decision.reason.length > 0,
  );
}
