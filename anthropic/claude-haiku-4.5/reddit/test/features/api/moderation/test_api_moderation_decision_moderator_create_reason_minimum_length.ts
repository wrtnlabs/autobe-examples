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

export async function test_api_moderation_decision_moderator_create_reason_minimum_length(
  connection: api.IConnection,
) {
  // 1. Register a moderator who will make the decision
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email:
          typia
            .random<string & tags.Format<"email">>()
            .split("@")[0]
            .substring(0, 10) + "@test.com",
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a decision with reason at exactly minimum length (10 characters)
  // The reason must be exactly 10 characters to test the lower boundary
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const reasonAtMinimumLength = "1234567890"; // Exactly 10 characters

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "no_action",
          reason: reasonAtMinimumLength,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 3. Validate that the decision was created with the exact minimum length reason
  TestValidator.equals(
    "decision reason matches the input reason",
    decision.reason,
    reasonAtMinimumLength,
  );
  TestValidator.predicate(
    "reason is exactly 10 characters (minimum required length)",
    decision.reason.length === 10,
  );
  TestValidator.equals(
    "action type is no_action",
    decision.action_type,
    "no_action",
  );
}
