import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test the Reddit Community platform's duplicate report prevention system.
 *
 * This test validates that members cannot submit duplicate content reports on
 * the same post, ensuring efficient moderation workflows while allowing
 * different users to report identical content for comprehensive community
 * oversight.
 *
 * The test implementation follows this workflow:
 *
 * 1. Create two authenticated member accounts representing different community
 *    users
 * 2. Create a text post that serves as the target content for reporting
 * 3. Submit an initial report from the first member to establish baseline
 * 4. Attempt duplicate report submission from the same member
 * 5. Validate that duplicate prevention is enforced through error handling
 * 6. Confirm different member can successfully report identical content
 * 7. Verify report categorization and reason documentation accuracy
 */
export async function test_api_member_content_report_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create first member account for initial report
  const firstMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const firstMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name()
          .replace(/\s+/g, "_")
          .toLowerCase()
          .slice(0, 21),
        email: firstMemberEmail,
        password: "SecurePassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(firstMember);

  // Step 2: Create second member account for cross-user validation
  const secondMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name()
          .replace(/\s+/g, "_")
          .toLowerCase()
          .slice(0, 21),
        email: secondMemberEmail,
        password: "SecurePassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 3: Create community and post type references for content creation
  // Note: Using random UUIDs since actual community creation API is not provided
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const postTypeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Create text post content for reporting
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Submit initial content report from first member
  const reportReason: string = RandomGenerator.paragraph({ sentences: 1 });
  const reportCategory: string = RandomGenerator.pick([
    "harassment",
    "spam",
    "hate_speech",
    "misinformation",
    "inappropriate_content",
  ] as const);

  const initialReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: reportReason,
          report_category: reportCategory,
          content_type: "post",
          post_id: post.id,
          comment_id: null, // Explicitly set to null since we're reporting a post
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // Step 6: Validate duplicate report prevention for same user
  await TestValidator.error("duplicate report should be rejected", async () => {
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 1 }),
          report_category: RandomGenerator.pick([
            "harassment",
            "spam",
            "hate_speech",
            "misinformation",
            "inappropriate_content",
          ] as const),
          content_type: "post",
          post_id: post.id,
          comment_id: null,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  });

  // Step 7: Switch to second member account
  // Create new connection context for second member authentication
  const secondConnection: api.IConnection = { ...connection, headers: {} };

  const reauthenticatedSecond: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(secondConnection, {
      body: {
        nickname: secondMember.nickname,
        email: secondMemberEmail,
        password: "SecurePassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(reauthenticatedSecond);

  // Step 8: Validate different member can report identical content
  const crossUserReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      secondConnection,
      {
        body: {
          report_reason: RandomGenerator.paragraph({ sentences: 1 }),
          report_category: RandomGenerator.pick([
            "harassment",
            "spam",
            "hate_speech",
            "misinformation",
            "inappropriate_content",
          ] as const),
          content_type: "post",
          post_id: post.id,
          comment_id: null,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(crossUserReport);

  // Step 9: Verify report integrity and content tracking
  TestValidator.equals(
    "report category matches specification",
    initialReport.report_category,
    reportCategory,
  );

  TestValidator.predicate(
    "report reason documented correctly",
    initialReport.report_reason.length > 0,
  );

  TestValidator.equals(
    "report status initializes correctly",
    initialReport.status,
    "submitted",
  );

  TestValidator.predicate(
    "reported content references correct post",
    initialReport.reported_post?.id === post.id,
  );

  TestValidator.notEquals(
    "cross-user report has different UUID",
    crossUserReport.id,
    initialReport.id,
  );

  TestValidator.equals(
    "cross-user report maintains same post reference",
    crossUserReport.reported_post?.id,
    post.id,
  );
}
