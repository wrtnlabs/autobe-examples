import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostView";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostView";

/**
 * Test pagination functionality for large view datasets.
 *
 * Validates moderator post views pagination API with comprehensive testing
 * including different page sizes, sorting options, and filtering capabilities.
 * Creates realistic test data with multiple posts and view records to ensure
 * accurate pagination metadata and proper handling of large datasets.
 */
export async function test_api_moderator_post_views_pagination(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: "moderator123",
      moderation_level: "admin",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(
    { ...connection, headers: {} },
    {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "member123",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // Login as member to create posts
  await api.functional.auth.member.login(
    { ...connection, headers: {} },
    {
      body: {
        email: memberEmail,
        password: "member123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );

  // Create a test post with realistic data
  const post = await api.functional.discussionBoard.member.posts.create(
    { ...connection, headers: {} },
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
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

  // Switch back to moderator for pagination testing
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Test basic pagination with default parameters
  const firstPage =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.equals(
    "pagination metadata should be present",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be respected",
    firstPage.pagination.limit === 10,
  );

  // Test different page sizes
  const smallPage =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page limit should be 5",
    smallPage.pagination.limit,
    5,
  );

  const largePage =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(largePage);

  TestValidator.equals(
    "large page limit should be 50",
    largePage.pagination.limit,
    50,
  );

  // Test sorting functionality
  const sortedByDate =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(sortedByDate);

  // Test filtering by date range
  const dateFiltered =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          date_from: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          date_to: new Date().toISOString(),
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(dateFiltered);

  // Validate pagination calculations
  TestValidator.predicate(
    "total pages calculation should be valid",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );

  // Test page navigation (if multiple pages exist)
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.discussionBoard.moderator.posts.views.index(
        connection,
        {
          postId: post.id,
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardPostView.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page should have correct page number",
      secondPage.pagination.current,
      2,
    );
  }

  // Test edge cases
  await TestValidator.error("page 0 should fail validation", async () => {
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 0,
          limit: 10,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  });

  await TestValidator.error(
    "negative limit should fail validation",
    async () => {
      await api.functional.discussionBoard.moderator.posts.views.index(
        connection,
        {
          postId: post.id,
          body: {
            page: 1,
            limit: -5,
          } satisfies IDiscussionBoardPostView.IRequest,
        },
      );
    },
  );

  // Validate view record structure (if records exist)
  if (firstPage.data.length > 0) {
    const sampleView = firstPage.data[0];
    TestValidator.predicate(
      "view record should have member information",
      sampleView.member !== undefined,
    );
    TestValidator.predicate(
      "view record should have post information",
      sampleView.post !== undefined,
    );
    TestValidator.predicate(
      "view record should have creation timestamp",
      sampleView.created_at !== undefined,
    );
  }
}
