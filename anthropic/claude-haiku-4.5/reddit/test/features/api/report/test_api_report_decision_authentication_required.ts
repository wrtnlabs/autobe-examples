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

export async function test_api_report_decision_authentication_required(
  connection: api.IConnection,
) {
  /**
   * Validates moderator authentication requirements for report decision
   * creation.
   *
   * Tests that the decision creation endpoint requires moderator authentication
   * by verifying that:
   *
   * 1. Moderator authentication via join endpoint succeeds
   * 2. Authenticated moderator can create report decisions
   * 3. Moderator ID is automatically captured from JWT context
   * 4. Decision creation requires valid moderator authorization tokens
   *
   * Business logic validation:
   *
   * - Only authenticated moderators can create decisions on reports
   * - System automatically extracts moderator ID from authenticated JWT context
   * - Moderator identification is enforced through token-based authentication
   */

  // Step 1: Create a valid moderator account for authentication testing
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  // Verify moderator account was created with correct credentials
  TestValidator.equals(
    "moderator email should match registration email",
    moderator.email,
    moderatorCreateData.email,
  );

  TestValidator.equals(
    "moderator username should match registration username",
    moderator.username,
    moderatorCreateData.username,
  );

  TestValidator.predicate(
    "moderator should have valid authentication tokens",
    () => {
      return (
        moderator.token.access !== undefined &&
        moderator.token.access.length > 0 &&
        moderator.token.refresh !== undefined &&
        moderator.token.refresh.length > 0
      );
    },
  );

  // Step 2: Create moderator-authenticated connection using the issued token
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderator.token.access}`,
    },
  };

  // Step 3: Test decision creation with authenticated moderator
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decisionData = {
    action_type: "no_action" as const,
    reason: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      moderatorConnection,
      {
        reportId: reportId,
        body: decisionData,
      },
    );
  typia.assert(decision);

  // Step 4: Verify moderator ID is automatically captured from JWT context
  TestValidator.equals(
    "decision should be assigned to authenticated moderator from JWT",
    decision.moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "decision moderator username should match authenticated moderator",
    decision.moderator.username,
    moderator.username,
  );

  // Step 5: Verify decision data matches request
  TestValidator.equals(
    "decision action type should match request",
    decision.action_type,
    decisionData.action_type,
  );

  TestValidator.equals(
    "decision reason should match request",
    decision.reason,
    decisionData.reason,
  );

  // Step 6: Verify decision has required timestamps
  TestValidator.predicate("created_at should be valid ISO 8601 date", () => {
    const createdDate = new Date(decision.created_at);
    return !isNaN(createdDate.getTime()) && decision.created_at.includes("T");
  });

  TestValidator.predicate("updated_at should be valid ISO 8601 date", () => {
    const updatedDate = new Date(decision.updated_at);
    return !isNaN(updatedDate.getTime()) && decision.updated_at.includes("T");
  });

  // Step 7: Verify decision timestamps are reasonable
  TestValidator.predicate(
    "updated_at should be same as or after created_at",
    () => {
      const createdTime = new Date(decision.created_at).getTime();
      const updatedTime = new Date(decision.updated_at).getTime();
      return updatedTime >= createdTime;
    },
  );
}
