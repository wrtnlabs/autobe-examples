import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test moderator creating a suspension decision with minimum duration (1 day).
 *
 * Verifies that the moderation system supports brief suspension durations and
 * properly records suspension decisions with the minimum restriction period.
 *
 * Test workflow:
 *
 * 1. Register first moderator account for authentication context
 * 2. Register second moderator account for performing moderation actions
 * 3. Register a member account (context for suspension)
 * 4. Create a suspension decision with minimum duration (1 day)
 * 5. Validate the decision contains proper action_type, reason, and duration
 *
 * This validates that minimum suspension durations (1 day) are properly
 * supported as an enforcement action for policy violations.
 */
export async function test_api_moderation_decision_moderator_create_suspend_user_minimum_duration(
  connection: api.IConnection,
) {
  // 1. Register first moderator (authentication prerequisite)
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(firstModerator);

  // 2. Register second moderator (for moderation action)
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: secondModeratorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(secondModerator);
  TestValidator.equals(
    "moderator created",
    typeof secondModerator.id,
    "string",
  );

  // 3. Register member (context for suspension)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals("member created", typeof member.id, "string");

  // 4. Create suspension decision with minimum duration (1 day)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community harassment policy with minimum suspension period applied",
          suspension_duration_days: 1,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 5. Validate decision properties
  TestValidator.equals(
    "decision action type is suspend_user",
    decision.action_type,
    "suspend_user",
  );
  TestValidator.equals(
    "suspension duration is minimum (1 day)",
    decision.suspension_duration_days,
    1,
  );
  TestValidator.predicate(
    "reason length meets minimum requirement",
    decision.reason.length >= 10,
  );
  TestValidator.equals(
    "decision has moderator identity",
    typeof decision.moderator.id,
    "string",
  );
  TestValidator.predicate(
    "decision has valid created timestamp",
    decision.created_at !== undefined,
  );
}
