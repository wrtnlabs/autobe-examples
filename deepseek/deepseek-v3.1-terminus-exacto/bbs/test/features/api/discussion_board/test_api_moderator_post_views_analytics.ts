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
 * Test moderator access to post view analytics for engagement analysis.
 *
 * This test validates that moderators can retrieve and filter post view
 * analytics with proper pagination controls, member filtering, date range
 * filtering, and sorting options. The test creates a moderator account, member
 * account, and test post, then exercises various analytics query scenarios to
 * ensure comprehensive engagement tracking functionality.
 */
export async function test_api_moderator_post_views_analytics(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: moderatorPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "basic",
      href: "https://discussion-board.example.com/register",
      referrer: "https://discussion-board.example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://discussion-board.example.com/register",
      referrer: "https://discussion-board.example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create test post for view analytics
  const post = await api.functional.discussionBoard.member.posts.create(
    connection,
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

  // Step 4: Switch to moderator context to access analytics
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: moderatorPassword,
      href: "https://discussion-board.example.com/login",
      referrer: "https://discussion-board.example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Test basic pagination without filters
  const basicAnalytics =
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
  typia.assert(basicAnalytics);

  TestValidator.equals(
    "pagination structure exists",
    typeof basicAnalytics.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    basicAnalytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicAnalytics.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    basicAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    basicAnalytics.pagination.pages >= 0,
  );

  // Step 6: Test filtering by member
  const memberFilteredAnalytics =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          member_id: member.id,
          order_by: "member",
          order: "asc",
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(memberFilteredAnalytics);

  // Step 7: Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateFilteredAnalytics =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 20,
          date_from: pastDate,
          date_to: currentDate,
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);

  // Step 8: Test combined filtering
  const combinedFilteredAnalytics =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 15,
          member_id: member.id,
          date_from: pastDate,
          date_to: currentDate,
          order_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(combinedFilteredAnalytics);

  // Step 9: Verify data structure consistency
  if (basicAnalytics.data.length > 0) {
    const sampleView = basicAnalytics.data[0];
    TestValidator.equals("view record has id", typeof sampleView.id, "string");
    TestValidator.equals(
      "view record has member",
      typeof sampleView.member,
      "object",
    );
    TestValidator.equals(
      "view record has post",
      typeof sampleView.post,
      "object",
    );
    TestValidator.equals(
      "view record has created_at",
      typeof sampleView.created_at,
      "string",
    );

    TestValidator.equals(
      "member summary has id",
      typeof sampleView.member.id,
      "string",
    );
    TestValidator.equals(
      "member summary has type",
      typeof sampleView.member.type,
      "string",
    );
    TestValidator.equals(
      "member summary has name",
      typeof sampleView.member.name,
      "string",
    );

    TestValidator.equals(
      "post summary has id",
      typeof sampleView.post.id,
      "string",
    );
    TestValidator.equals(
      "post summary has type",
      typeof sampleView.post.type,
      "string",
    );
    TestValidator.equals(
      "post summary has title",
      typeof sampleView.post.title,
      "string",
    );
  }

  // Step 10: Test error handling for non-existent post
  await TestValidator.error("should fail for non-existent post", async () => {
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  });
}
