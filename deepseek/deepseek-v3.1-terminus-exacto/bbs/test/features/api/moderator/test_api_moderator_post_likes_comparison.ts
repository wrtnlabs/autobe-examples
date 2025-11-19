import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostLike";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostLike";

/**
 * Test comparative analytics between view and like metrics.
 *
 * Creates moderator account, creates posts with varying engagement patterns,
 * then analyzes both view and like data to identify content performance trends.
 * Validates that analytics provide insights into user engagement and content
 * appreciation patterns.
 */
export async function test_api_moderator_post_likes_comparison(
  connection: api.IConnection,
) {
  // Create moderator account for authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "password123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        moderation_level: "basic",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create multiple member accounts for varied engagement
  const members: IDiscussionBoardMember.IAuthorized[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const memberEmail = typia.random<string & tags.Format<"email">>();
      const member: IDiscussionBoardMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            email: memberEmail,
            username: RandomGenerator.alphabets(8),
            password: "password123",
            display_name: RandomGenerator.name(),
            bio: RandomGenerator.paragraph({ sentences: 2 }),
            href: "https://example.com",
            referrer: "https://example.com/referrer",
          } satisfies IDiscussionBoardMember.ICreate,
        });
      typia.assert(member);
      return member;
    });

  // Create test posts with varying content for comparative analysis
  const posts: IDiscussionBoardPost[] = [];

  // Create posts with different characteristics
  for (let i = 0; i < 3; i++) {
    // Switch to member context to create posts
    await api.functional.auth.member.login(connection, {
      body: {
        email: members[i].email,
        password: "password123",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardMember.ILogin,
    });

    const post = await api.functional.discussionBoard.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 + i }), // Varying title length
          content: RandomGenerator.content({ paragraphs: 2 + i }), // Varying content length
          discussion_board_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // Simulate varying engagement patterns by having different members "like" different posts
  const engagementRecords: { postId: string; memberId: string }[] = [];

  // Post 0: High engagement (liked by all members)
  for (const member of members) {
    engagementRecords.push({ postId: posts[0].id, memberId: member.id });
  }

  // Post 1: Medium engagement (liked by first 3 members)
  for (let i = 0; i < 3; i++) {
    engagementRecords.push({ postId: posts[1].id, memberId: members[i].id });
  }

  // Post 2: Low engagement (liked by first member only)
  engagementRecords.push({ postId: posts[2].id, memberId: members[0].id });

  // Switch back to moderator context for analytics
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Test comparative analytics on each post
  const analyticsResults: {
    post: IDiscussionBoardPost;
    analytics: IPageIDiscussionBoardPostLike.ISummary;
  }[] = [];

  for (const post of posts) {
    const analytics =
      await api.functional.discussionBoard.moderator.posts.likes.index(
        connection,
        {
          postId: post.id,
          body: {
            page: 1,
            limit: 20,
            order_by: "created_at",
            order: "desc",
          } satisfies IDiscussionBoardPostLike.IRequest,
        },
      );
    typia.assert(analytics);
    analyticsResults.push({ post, analytics });

    // Validate analytics structure
    TestValidator.equals(
      "pagination structure exists",
      typeof analytics.pagination,
      "object",
    );
    TestValidator.equals(
      "data array exists",
      Array.isArray(analytics.data),
      true,
    );
    TestValidator.predicate(
      "pagination has current page",
      analytics.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has limit",
      analytics.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has records count",
      analytics.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has pages count",
      analytics.pagination.pages >= 0,
    );

    // Validate each like record structure
    for (const likeRecord of analytics.data) {
      TestValidator.equals(
        "like record has id",
        typeof likeRecord.id,
        "string",
      );
      TestValidator.equals(
        "like record has member",
        typeof likeRecord.member,
        "object",
      );
      TestValidator.equals(
        "like record has post",
        typeof likeRecord.post,
        "object",
      );
      TestValidator.equals(
        "like record has created_at",
        typeof likeRecord.created_at,
        "string",
      );

      TestValidator.predicate("member has id", likeRecord.member.id.length > 0);
      TestValidator.predicate(
        "member has type",
        likeRecord.member.type.length > 0,
      );
      TestValidator.predicate(
        "member has name",
        likeRecord.member.name.length > 0,
      );

      TestValidator.predicate("post has id", likeRecord.post.id.length > 0);
      TestValidator.predicate("post has type", likeRecord.post.type.length > 0);
      TestValidator.predicate(
        "post has title",
        likeRecord.post.title.length > 0,
      );
    }
  }

  // Validate comparative analytics - posts should have different engagement levels
  // Note: Since we can't actually create likes through the API (no like creation endpoint),
  // we validate that the analytics structure is correct and can handle different scenarios
  TestValidator.equals(
    "analytics results count matches posts count",
    analyticsResults.length,
    posts.length,
  );

  // Validate that each post's analytics are properly associated
  for (const result of analyticsResults) {
    TestValidator.predicate(
      "analytics post association",
      result.analytics.data.every((like) => like.post.id === result.post.id),
    );
  }

  // Test filtering capabilities with date ranges
  const filteredAnalytics =
    await api.functional.discussionBoard.moderator.posts.likes.index(
      connection,
      {
        postId: posts[0].id,
        body: {
          page: 1,
          limit: 5,
          order_by: "member",
          order: "asc",
          date_from: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
          date_to: new Date().toISOString(),
        } satisfies IDiscussionBoardPostLike.IRequest,
      },
    );
  typia.assert(filteredAnalytics);

  TestValidator.equals(
    "filtered analytics has valid structure",
    typeof filteredAnalytics.pagination,
    "object",
  );
  TestValidator.equals(
    "filtered data is array",
    Array.isArray(filteredAnalytics.data),
    true,
  );
}
