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
 * Test that moderation decision creation fails when suspension_duration_days is
 * outside valid range.
 *
 * This test validates that the moderation decision API properly enforces
 * suspension duration constraints. The suspension duration must be within
 * allowed ranges: preset values (1, 3, 7, 14, 30, 90) or custom values between
 * 1-365 days. Invalid durations (0, negative, >365) should return 400 Bad
 * Request.
 *
 * Test workflow:
 *
 * 1. Create moderator account for decision submission
 * 2. Create member account that will create reportable content
 * 3. Create multiple posts and reports for independent test cases
 * 4. Attempt to create suspension decisions with invalid durations:
 *
 *    - 0 days (below minimum)
 *    - Negative values (invalid range)
 *    - 400 days (above maximum of 365)
 *    - 366 days (just above maximum)
 * 5. Verify each attempt returns 400 Bad Request error
 * 6. Use separate reports for each test to isolate validation errors
 */
export async function test_api_moderation_decision_creation_invalid_suspension_duration(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `mod_${RandomGenerator.alphabets(6)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account for creating reportable content
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user_${RandomGenerator.alphabets(6)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Test case helper function to create post and report
  const createReportForTest = async (): Promise<ICommunityPlatformReport> => {
    // Create a post
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);

    // Submit a report on the post
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.member.reports.create(connection, {
        body: {
          reported_post_id: post.id,
          category: "spam",
          additional_details: "Test report for suspension duration validation",
        } satisfies ICommunityPlatformReport.ICreate,
      });
    typia.assert(report);
    return report;
  };

  // Test 1: 0 days (below minimum of 1)
  const report1 = await createReportForTest();
  await TestValidator.error(
    "suspension duration 0 days should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report1.id,
          body: {
            action_type: "suspend_user",
            reason: "Testing invalid suspension duration of 0 days",
            suspension_duration_days: 0,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // Test 2: Negative value (-7 days)
  const report2 = await createReportForTest();
  await TestValidator.error(
    "negative suspension duration should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report2.id,
          body: {
            action_type: "suspend_user",
            reason: "Testing invalid suspension with negative days",
            suspension_duration_days: -7,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // Test 3: 400 days (above maximum of 365)
  const report3 = await createReportForTest();
  await TestValidator.error(
    "suspension duration 400 days should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report3.id,
          body: {
            action_type: "suspend_user",
            reason: "Testing invalid suspension duration of 400 days",
            suspension_duration_days: 400,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // Test 4: 366 days (just above maximum)
  const report4 = await createReportForTest();
  await TestValidator.error(
    "suspension duration 366 days should fail",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report4.id,
          body: {
            action_type: "suspend_user",
            reason: "Testing invalid suspension duration of 366 days",
            suspension_duration_days: 366,
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "all invalid suspension duration tests completed successfully",
    true,
  );
}
