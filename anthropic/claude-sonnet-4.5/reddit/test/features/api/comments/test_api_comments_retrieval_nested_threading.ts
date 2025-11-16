import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test retrieval of nested comment replies with proper depth indicators for
 * threaded discussion display.
 *
 * This test validates that the comment system correctly handles nested reply
 * structures and provides accurate depth information for UI rendering in
 * threaded discussions.
 *
 * Test Steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Create a community for the discussion
 * 3. Create and authenticate as member
 * 4. Create a post to host the threaded comments
 * 5. Create top-level comment (depth 0)
 * 6. Create nested replies at multiple levels (depth 1, 2, 3)
 * 7. Retrieve comments and validate depth values
 * 8. Verify full thread structure is preserved
 */
export async function test_api_comments_retrieval_nested_threading(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 4 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a post to host the discussion
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        post_type: "text" as const,
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create top-level comment (depth 0)
  const topLevelComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 5,
            wordMax: 10,
          }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  TestValidator.equals(
    "top-level comment has depth 0",
    topLevelComment.depth,
    0,
  );

  // Step 6: Create nested reply level 1 (depth 1)
  const replyLevel1 =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 9,
          }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyLevel1);
  TestValidator.equals("first-level reply has depth 1", replyLevel1.depth, 1);

  // Step 7: Create nested reply level 2 (depth 2)
  const replyLevel2 =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: replyLevel1.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
          parent_comment_id: replyLevel1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyLevel2);
  TestValidator.equals("second-level reply has depth 2", replyLevel2.depth, 2);

  // Step 8: Create nested reply level 3 (depth 3)
  const replyLevel3 =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: replyLevel2.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 7,
          }),
          parent_comment_id: replyLevel2.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyLevel3);
  TestValidator.equals("third-level reply has depth 3", replyLevel3.depth, 3);

  // Step 9: Retrieve all comments and validate depth indicators
  const commentsPage =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        sort: "new",
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(commentsPage);

  // Validate pagination metadata
  TestValidator.predicate(
    "comments were retrieved",
    commentsPage.data.length >= 4,
  );

  // Validate that all created comments are in the result
  const commentIds = commentsPage.data.map((c) => c.id);
  TestValidator.predicate(
    "top-level comment is in results",
    commentIds.includes(topLevelComment.id),
  );
  TestValidator.predicate(
    "level 1 reply is in results",
    commentIds.includes(replyLevel1.id),
  );
  TestValidator.predicate(
    "level 2 reply is in results",
    commentIds.includes(replyLevel2.id),
  );
  TestValidator.predicate(
    "level 3 reply is in results",
    commentIds.includes(replyLevel3.id),
  );

  // Validate depth values in retrieved comments
  const retrievedTopLevel = commentsPage.data.find(
    (c) => c.id === topLevelComment.id,
  );
  typia.assertGuard(retrievedTopLevel!);
  TestValidator.equals(
    "retrieved top-level comment has depth 0",
    retrievedTopLevel.depth,
    0,
  );

  const retrievedLevel1 = commentsPage.data.find(
    (c) => c.id === replyLevel1.id,
  );
  typia.assertGuard(retrievedLevel1!);
  TestValidator.equals(
    "retrieved level 1 reply has depth 1",
    retrievedLevel1.depth,
    1,
  );

  const retrievedLevel2 = commentsPage.data.find(
    (c) => c.id === replyLevel2.id,
  );
  typia.assertGuard(retrievedLevel2!);
  TestValidator.equals(
    "retrieved level 2 reply has depth 2",
    retrievedLevel2.depth,
    2,
  );

  const retrievedLevel3 = commentsPage.data.find(
    (c) => c.id === replyLevel3.id,
  );
  typia.assertGuard(retrievedLevel3!);
  TestValidator.equals(
    "retrieved level 3 reply has depth 3",
    retrievedLevel3.depth,
    3,
  );

  // Validate that comments at different nesting levels are correctly identified
  const depthCounts = commentsPage.data.reduce(
    (acc, comment) => {
      acc[comment.depth] = (acc[comment.depth] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  TestValidator.predicate(
    "at least one comment at depth 0 exists",
    (depthCounts[0] || 0) >= 1,
  );
  TestValidator.predicate(
    "at least one comment at depth 1 exists",
    (depthCounts[1] || 0) >= 1,
  );
  TestValidator.predicate(
    "at least one comment at depth 2 exists",
    (depthCounts[2] || 0) >= 1,
  );
  TestValidator.predicate(
    "at least one comment at depth 3 exists",
    (depthCounts[3] || 0) >= 1,
  );
}
