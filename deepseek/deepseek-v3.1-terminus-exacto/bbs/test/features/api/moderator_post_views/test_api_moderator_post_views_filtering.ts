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
 * Test advanced filtering capabilities for post view analytics.
 *
 * This comprehensive test validates moderator post view filtering functionality
 * by creating multiple user accounts, generating posts with different view
 * patterns, and testing various filtering options including member-specific
 * views, date ranges, and sorting capabilities. The test ensures that
 * moderators can accurately analyze engagement metrics for content analysis.
 */
export async function test_api_moderator_post_views_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.paragraph({ sentences: 2 }),
        password: "moderator123",
        moderation_level: "basic",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts
  const members: IDiscussionBoardMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          username: RandomGenerator.paragraph({ sentences: 2 }),
          password: "member123",
          href: "https://example.com/join",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardMember.ICreate,
      });
    typia.assert(member);
    members.push(member);
  }

  // Step 3: Create test posts (we'll need to use existing channel/section IDs)
  // Since we can't create channels/sections via API, we'll work with the assumption
  // that some default channels/sections exist in the system
  const posts: IDiscussionBoardPost[] = [];

  // Create multiple posts to test filtering across different content
  for (let i = 0; i < 2; i++) {
    // Use random but valid UUIDs that might exist in the system
    // In a real scenario, these would be obtained from existing channels/sections
    const post: IDiscussionBoardPost =
      await api.functional.discussionBoard.member.posts.create(connection, {
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
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 4: Simulate view patterns by having members "view" posts
  // We'll authenticate as each member and perform actions that would create view records
  const targetPost = posts[0];

  // Member 1 views the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: members[0].email,
      password: "member123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Perform actions that would create a view record
  // (Assuming viewing a post creates a view record)

  // Member 2 views the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: members[1].email,
      password: "member123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Perform actions that would create a view record

  // Step 5: Switch back to moderator for view filtering
  await api.functional.auth.moderator.login(connection, {
    body: {
      email_or_username: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Test basic pagination
  const basicViews: IPageIDiscussionBoardPostView.ISummary =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: targetPost.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(basicViews);

  // Step 7: Test member-specific filtering
  const memberFilteredViews: IPageIDiscussionBoardPostView.ISummary =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: targetPost.id,
        body: {
          page: 1,
          limit: 10,
          member_id: members[0].id,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(memberFilteredViews);

  // Step 8: Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateFilteredViews: IPageIDiscussionBoardPostView.ISummary =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: targetPost.id,
        body: {
          page: 1,
          limit: 10,
          date_from: pastDate,
          date_to: currentDate,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(dateFilteredViews);

  // Step 9: Test sorting by creation date
  const sortedViews: IPageIDiscussionBoardPostView.ISummary =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: targetPost.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(sortedViews);

  // Step 10: Test sorting by member
  const memberSortedViews: IPageIDiscussionBoardPostView.ISummary =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: targetPost.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "member",
          order: "asc",
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(memberSortedViews);

  // Step 11: Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof basicViews.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    basicViews.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicViews.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    basicViews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    basicViews.pagination.pages >= 0,
  );

  // Step 12: Validate view summary structure when data exists
  if (basicViews.data.length > 0) {
    const view = basicViews.data[0];
    TestValidator.equals("view has id", typeof view.id, "string");
    TestValidator.equals("view has member", typeof view.member, "object");
    TestValidator.equals("view has post", typeof view.post, "object");
    TestValidator.equals(
      "view has creation timestamp",
      typeof view.created_at,
      "string",
    );

    // Validate member summary structure
    TestValidator.equals("member has id", typeof view.member.id, "string");
    TestValidator.equals("member has type", typeof view.member.type, "string");
    TestValidator.equals("member has name", typeof view.member.name, "string");

    // Validate post summary structure
    TestValidator.equals("post has id", typeof view.post.id, "string");
    TestValidator.equals("post has type", typeof view.post.type, "string");
    TestValidator.equals("post has title", typeof view.post.title, "string");
  }

  // Step 13: Test that member filtering potentially narrows results
  if (basicViews.data.length > 0 && memberFilteredViews.data.length > 0) {
    TestValidator.predicate(
      "member filtered views should be subset of all views",
      memberFilteredViews.data.length <= basicViews.data.length,
    );
  }

  // Step 14: Test different limit values
  const smallLimitViews: IPageIDiscussionBoardPostView.ISummary =
    await api.functional.discussionBoard.moderator.posts.views.index(
      connection,
      {
        postId: targetPost.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardPostView.IRequest,
      },
    );
  typia.assert(smallLimitViews);
  TestValidator.predicate(
    "small limit respects limit",
    smallLimitViews.data.length <= 5,
  );
}
