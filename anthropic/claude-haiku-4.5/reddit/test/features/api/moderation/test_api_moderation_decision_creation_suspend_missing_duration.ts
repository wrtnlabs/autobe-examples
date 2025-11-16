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
 * Test moderation decision creation validation for suspension duration
 * requirement.
 *
 * Validates the business rule that when action_type is 'suspend_user',
 * suspension_duration_days must be provided and validated by the backend.
 *
 * Test flow:
 *
 * 1. Create moderator account via authentication
 * 2. Create member account for reporting
 * 3. Create post to be reported
 * 4. Submit report on the post
 * 5. Attempt to create decision with suspend_user without duration (expects error)
 * 6. Create decision with suspend_user and valid duration (should succeed)
 * 7. Verify non-suspension actions succeed regardless of duration parameter
 */
export async function test_api_moderation_decision_creation_suspend_missing_duration(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Switch to moderator context
  connection.headers ??= {};
  connection.headers.Authorization = moderator.token.access;

  // 2. Create member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Submit report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          reported_post_id: post.id,
          category: "harassment",
          additional_details: "This post contains offensive content",
          reporter_contact_email: memberEmail,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // 5. Test error case: suspend_user without suspension_duration_days
  await TestValidator.error(
    "should fail when suspend_user action lacks suspension_duration_days",
    async () => {
      await api.functional.communityPlatform.moderator.reports.decision.create(
        connection,
        {
          reportId: report.id,
          body: {
            action_type: "suspend_user",
            reason: "User account requires suspension due to policy violations",
          } satisfies ICommunityPlatformReportDecision.ICreate,
        },
      );
    },
  );

  // 6. Test success case: suspend_user with valid suspension_duration_days
  const suspensionDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: "User account requires suspension due to policy violations",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(suspensionDecision);
  TestValidator.equals(
    "suspension decision has correct action_type",
    suspensionDecision.action_type,
    "suspend_user",
  );
  TestValidator.equals(
    "suspension duration is set correctly",
    suspensionDecision.suspension_duration_days,
    7,
  );

  // 7. Create another report for testing non-suspension action
  const report2: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          reported_post_id: post.id,
          category: "spam",
          additional_details: "Spam content",
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report2);

  // Test non-suspension action with duration provided (should succeed, duration ignored)
  const warningDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report2.id,
        body: {
          action_type: "issue_warning",
          reason: "User has been warned about spam content",
          suspension_duration_days: 5,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(warningDecision);
  TestValidator.equals(
    "warning decision has correct action_type",
    warningDecision.action_type,
    "issue_warning",
  );
}
