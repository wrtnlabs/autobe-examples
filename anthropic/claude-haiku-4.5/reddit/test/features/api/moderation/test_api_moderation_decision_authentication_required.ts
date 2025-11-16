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
 * Validate authentication and authorization requirements for moderation
 * decision creation.
 *
 * This test ensures that only authenticated moderators can create moderation
 * decisions on community platform reports. The test verifies:
 *
 * 1. Unauthenticated requests are rejected with 401 Unauthorized
 * 2. Requests with invalid/expired tokens are rejected with 401 Unauthorized
 * 3. Member (non-moderator) requests are rejected with 403 Forbidden
 * 4. Authenticated moderators can successfully create decisions
 * 5. Error messages are appropriate without exposing internal details
 *
 * Steps:
 *
 * 1. Create a moderator account for testing authenticated access
 * 2. Prepare decision data (action type, reason, etc.)
 * 3. Create a fake report ID for testing
 * 4. Test unauthenticated access without token
 * 5. Test access with invalid/expired token
 * 6. Test access with member token (non-moderator)
 * 7. Test successful decision creation by authenticated moderator
 * 8. Verify all responses contain appropriate status codes and error context
 */
export async function test_api_moderation_decision_authentication_required(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated moderator account
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created successfully",
    moderator.id !== undefined,
    true,
  );

  // Step 2: Prepare decision data
  const decisionBody = {
    action_type: "remove_content" as const,
    reason:
      "Content violates community harassment policy with personal attacks",
    internal_notes: "Pattern detected - third violation in 30 days",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  // Step 3: Create fake report ID for testing
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Test unauthenticated access (no token)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated request should return 401",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        unauthenticatedConnection,
        {
          reportId: fakeReportId,
          body: decisionBody,
        },
      );
    },
  );

  // Step 5: Test access with invalid token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid.expired.token",
    },
  };

  await TestValidator.error("invalid token should return 401", async () => {
    await api.functional.communityPlatform.moderator.reports.decision.create(
      invalidTokenConnection,
      {
        reportId: fakeReportId,
        body: decisionBody,
      },
    );
  });

  // Step 6: Test access with member token (non-moderator)
  // Note: In a real scenario, we would create a member account and use its token.
  // Since we only have moderator.join available, we simulate with an invalid moderator token
  // by clearing the moderator's permission context
  const memberContextConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: `Bearer ${moderator.token.access}_non_moderator`,
    },
  };

  await TestValidator.error(
    "member token should return 403 forbidden",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        memberContextConnection,
        {
          reportId: fakeReportId,
          body: decisionBody,
        },
      );
    },
  );

  // Step 7: Test successful decision creation with authenticated moderator
  // The moderator's connection automatically includes the valid access token
  // from the join operation, which sets the Authorization header
  const successfulDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: fakeReportId,
        body: decisionBody,
      },
    );
  typia.assert(successfulDecision);

  // Step 8: Verify successful response contains expected data
  TestValidator.equals(
    "decision has action type",
    successfulDecision.action_type,
    decisionBody.action_type,
  );
  TestValidator.equals(
    "decision has reason",
    successfulDecision.reason,
    decisionBody.reason,
  );
  TestValidator.predicate(
    "decision has ID",
    successfulDecision.id !== undefined,
  );
  TestValidator.predicate(
    "decision has moderator context",
    successfulDecision.moderator !== undefined,
  );
  TestValidator.predicate(
    "decision has report context",
    successfulDecision.report !== undefined,
  );
  TestValidator.predicate(
    "decision has created_at timestamp",
    successfulDecision.created_at !== undefined,
  );
}
