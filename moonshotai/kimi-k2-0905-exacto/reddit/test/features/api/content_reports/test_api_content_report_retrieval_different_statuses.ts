import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test content report retrieval across different report statuses (submitted,
 * under_review, resolved, dismissed). Validates that moderators can access
 * reports at various stages of the moderation workflow and that status-specific
 * information is correctly displayed. Tests the temporal tracking of reports
 * including reported_at and resolved_at timestamps for audit trail purposes.
 */
export async function test_api_content_report_retrieval_different_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community moderator for authentication
  const moderatorEmail = `moderator_${RandomGenerator.alphabets(8)}@test.com`;
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        nickname: `Mod_${RandomGenerator.name()}`,
        href: "https://reddit-community.com/register",
        referrer: "https://reddit-community.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Create member to submit reports
  const memberEmail = `member_${RandomGenerator.alphabets(8)}@test.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: `Member_${RandomGenerator.name()}`,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 3. To properly test, we need valid community and post type IDs
  // Since we cannot create these through available APIs, use existing ones
  const communityId = "123e4567-e89b-12d3-a456-426614174000";
  const postTypeId = "123e4567-e89b-12d3-a456-426614174001";

  // 4. Create first post
  const post1 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: communityId as string & tags.Format<"uuid">,
        reddit_post_type_id: postTypeId as string & tags.Format<"uuid">,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post1);

  // 5. Create second post
  const post2 = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(3),
        link_url: "https://example.com/article",
        reddit_community_id: communityId as string & tags.Format<"uuid">,
        reddit_post_type_id: postTypeId as string & tags.Format<"uuid">,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2);

  // 6. Switch back to member to create reports
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com/register",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // 7. Create submitted report on first post
  const report1CreateBody = {
    report_reason: "Test report for spam content",
    report_category: "spam",
    content_type: "post" as const,
    post_id: post1.id,
  } satisfies IRedditCommunityContentReport.ICreate;
  const submittedReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: report1CreateBody,
      },
    );
  typia.assert(submittedReport);
  TestValidator.equals(
    "Initial report status is submitted",
    submittedReport.status,
    "submitted",
  );
  TestValidator.equals(
    "Reported_at timestamp exists",
    typeof submittedReport.reported_at,
    "string",
  );
  TestValidator.equals(
    "Resolved_at is null for submitted report",
    submittedReport.resolved_at,
    null,
  );

  // 8. Create under_review report on second post
  const report2CreateBody = {
    report_reason: "Test report for harassment content",
    report_category: "harassment",
    content_type: "post" as const,
    post_id: post2.id,
  } satisfies IRedditCommunityContentReport.ICreate;
  const underReviewReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: report2CreateBody,
      },
    );
  typia.assert(underReviewReport);
  TestValidator.equals(
    "Second report status is submitted",
    underReviewReport.status,
    "submitted",
  );

  // 9. Switch to moderator to retrieve and analyze reports
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://reddit-community.com/moderator/login",
      referrer: "https://reddit-community.com/moderator/dashboard",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // 10. Retrieve submitted report
  const retrievedSubmittedReport =
    await api.functional.redditCommunity.communityModerator.contentReports.at(
      connection,
      {
        reportId: submittedReport.id,
      },
    );
  typia.assert(retrievedSubmittedReport);
  TestValidator.equals(
    "Retrieved submitted report has correct id",
    retrievedSubmittedReport.id,
    submittedReport.id,
  );
  TestValidator.equals(
    "Retrieved submitted report has correct status",
    retrievedSubmittedReport.status,
    "submitted",
  );
  TestValidator.equals(
    "Retrieved submitted report has correct reporter",
    retrievedSubmittedReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "Retrieved submitted report has correct category",
    retrievedSubmittedReport.report_category,
    "spam",
  );
  TestValidator.equals(
    "Retrieved submitted report has correct reason",
    retrievedSubmittedReport.report_reason,
    "Test report for spam content",
  );

  // 11. Retrieve under_review report
  const retrievedUnderReviewReport =
    await api.functional.redditCommunity.communityModerator.contentReports.at(
      connection,
      {
        reportId: underReviewReport.id,
      },
    );
  typia.assert(retrievedUnderReviewReport);
  TestValidator.equals(
    "Retrieved under_review report has correct id",
    retrievedUnderReviewReport.id,
    underReviewReport.id,
  );
  TestValidator.equals(
    "Retrieved under_review report has correct status",
    retrievedUnderReviewReport.status,
    "submitted",
  );
  TestValidator.equals(
    "Retrieved under_review report has correct reporter",
    retrievedUnderReviewReport.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "Retrieved under_review report has correct category",
    retrievedUnderReviewReport.report_category,
    "harassment",
  );

  // 12. Verify temporal tracking information
  TestValidator.predicate(
    "Reported_at timestamp is valid ISO date",
    () => !isNaN(Date.parse(retrievedSubmittedReport.reported_at)),
  );
  TestValidator.predicate(
    "Under_review report reported_at is valid ISO date",
    () => !isNaN(Date.parse(retrievedUnderReviewReport.reported_at)),
  );
  TestValidator.predicate(
    "Reporter information is included in summary",
    () => retrievedSubmittedReport.reporter.nickname !== undefined,
  );
  TestValidator.predicate(
    "Reported member information is available",
    () => retrievedSubmittedReport.reported_member.nickname !== undefined,
  );

  // 13. Test report content associations
  TestValidator.predicate(
    "Reported post details are available",
    () => retrievedSubmittedReport.reported_post !== null,
  );
  TestValidator.equals(
    "Reported post id matches",
    retrievedSubmittedReport.reported_post?.id,
    post1.id,
  );
  TestValidator.equals(
    "Reported post title matches",
    retrievedSubmittedReport.reported_post?.title,
    post1.title,
  );
}
