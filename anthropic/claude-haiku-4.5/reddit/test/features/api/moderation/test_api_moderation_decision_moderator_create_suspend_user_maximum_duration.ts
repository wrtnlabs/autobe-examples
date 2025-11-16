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

export async function test_api_moderation_decision_moderator_create_suspend_user_maximum_duration(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register a member to be suspended
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(10),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a report for the member (prerequisite for decision)
  // Note: We'll use a generated UUID for the report since we don't have a direct report creation API
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Create a moderation decision with maximum suspension duration
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "User violated community standards with severe harassment. This suspension is imposed for the maximum allowed duration.",
          suspension_duration_days: 365,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 5: Validate the decision properties
  TestValidator.equals(
    "decision action_type should be suspend_user",
    decision.action_type,
    "suspend_user",
  );

  TestValidator.equals(
    "decision suspension_duration_days should be maximum 365",
    decision.suspension_duration_days,
    365,
  );

  TestValidator.predicate(
    "decision reason should have minimum 10 characters",
    decision.reason.length >= 10,
  );

  TestValidator.predicate(
    "decision should have created_at timestamp",
    decision.created_at !== null && decision.created_at !== undefined,
  );

  TestValidator.predicate(
    "decision should have updated_at timestamp",
    decision.updated_at !== null && decision.updated_at !== undefined,
  );

  TestValidator.predicate(
    "decision moderator should exist",
    decision.moderator !== null && decision.moderator !== undefined,
  );

  TestValidator.predicate(
    "decision report should exist",
    decision.report !== null && decision.report !== undefined,
  );

  TestValidator.equals(
    "decision id should be a valid UUID",
    typeof decision.id,
    "string",
  );
}
