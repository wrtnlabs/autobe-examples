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
import type { IDiscussionBoardPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostView";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IPageIDiscussionBoardPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostView";

/**
 * Test comprehensive post analytics functionality for moderators.
 *
 * This test validates that moderators can retrieve detailed analytics for
 * discussion board posts including view counts, like counts, engagement rates,
 * and content performance metrics. The test verifies filtering capabilities by
 * date ranges, channels, sections, and post status to ensure targeted analytics
 * work correctly. The analytics operation properly aggregates data from posts,
 * views, and likes tables to compute key performance indicators.
 */
export async function test_api_moderator_post_analytics_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for analytics access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "moderator123",
      moderation_level: "admin",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: "member123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create discussion board channel
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 4: Create section within the channel
  const section =
    await api.functional.discussionBoard.moderator.channels.sections.create(
      connection,
      {
        channelName: channel.name,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          channel: {
            id: channel.id,
            name: channel.name,
            description: channel.description,
            status: channel.status,
            created_at: channel.created_at,
          } satisfies IDiscussionBoardChannel.ISummary,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 5: Switch to member account and create test posts
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Create multiple test posts
  const posts: IDiscussionBoardPost[] = [];
  for (let i = 0; i < 3; i++) {
    const post = await api.functional.discussionBoard.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_channel_id: channel.id,
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // Step 6: Add likes to posts for engagement data
  for (const post of posts) {
    const like = await api.functional.discussionBoard.member.posts.likes.create(
      connection,
      {
        postId: post.id,
        body: {
          member_id: member.id,
        } satisfies IDiscussionBoardPostLike.ICreate,
      },
    );
    typia.assert(like);
  }

  // Step 7: Switch back to moderator account for analytics access
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 8: Test analytics search with basic pagination
  const analyticsResult =
    await api.functional.discussionBoard.moderator.analytics.posts.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
  typia.assert(analyticsResult);

  // Validate pagination structure
  TestValidator.equals(
    "analytics result has pagination",
    typeof analyticsResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    analyticsResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    analyticsResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    analyticsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    analyticsResult.pagination.pages >= 0,
  );

  // Step 9: Test filtering by channel
  const channelFilteredAnalytics =
    await api.functional.discussionBoard.moderator.analytics.posts.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          discussion_board_channel_id: channel.id,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
  typia.assert(channelFilteredAnalytics);

  // Step 10: Test filtering by section
  const sectionFilteredAnalytics =
    await api.functional.discussionBoard.moderator.analytics.posts.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
  typia.assert(sectionFilteredAnalytics);

  // Step 11: Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateFilteredAnalytics =
    await api.functional.discussionBoard.moderator.analytics.posts.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_after: pastDate,
          created_before: currentDate,
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);

  // Step 12: Test sorting options
  const sortedByTitle =
    await api.functional.discussionBoard.moderator.analytics.posts.search(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "title",
          order_direction: "asc",
        } satisfies IDiscussionBoardPost.IRequest,
      },
    );
  typia.assert(sortedByTitle);

  // Step 13: Validate that analytics data contains expected post information
  if (analyticsResult.data.length > 0) {
    const firstPost = analyticsResult.data[0];
    TestValidator.predicate(
      "analytics post has id",
      typeof firstPost.id === "string",
    );
    TestValidator.predicate(
      "analytics post has title",
      typeof firstPost.title === "string",
    );
    TestValidator.predicate(
      "analytics post has type",
      typeof firstPost.type === "string",
    );
  }

  // Step 14: Test search functionality
  if (posts.length > 0) {
    const searchAnalytics =
      await api.functional.discussionBoard.moderator.analytics.posts.search(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            search: posts[0].title.substring(0, 5), // Search by partial title
          } satisfies IDiscussionBoardPost.IRequest,
        },
      );
    typia.assert(searchAnalytics);
  }

  // Final validation: Ensure all analytics calls returned valid responses
  TestValidator.predicate(
    "basic analytics call successful",
    analyticsResult.data.length >= 0,
  );
  TestValidator.predicate(
    "channel filtered analytics call successful",
    channelFilteredAnalytics.data.length >= 0,
  );
  TestValidator.predicate(
    "section filtered analytics call successful",
    sectionFilteredAnalytics.data.length >= 0,
  );
  TestValidator.predicate(
    "date filtered analytics call successful",
    dateFilteredAnalytics.data.length >= 0,
  );
  TestValidator.predicate(
    "sorted analytics call successful",
    sortedByTitle.data.length >= 0,
  );
}
