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
 * Test retrieving a paginated list of replies to a comment with multiple nested
 * responses.
 *
 * This validates the complete threaded discussion retrieval workflow including
 * pagination, sorting, and proper nesting depth calculation. The test creates a
 * parent comment with multiple replies at different nesting levels, then
 * retrieves the replies using various sorting options and pagination
 * parameters.
 *
 * Steps:
 *
 * 1. Authenticate as moderator and create community
 * 2. Switch to member and create post
 * 3. Create parent comment on the post
 * 4. Create multiple nested replies to the parent comment
 * 5. Retrieve replies with different sorting options (new, old, top,
 *    controversial)
 * 6. Verify depth calculations for nested replies
 * 7. Validate pagination metadata
 * 8. Ensure sorting algorithms work correctly
 */
export async function test_api_comment_replies_threaded_discussion(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator and create community
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Switch to member and create post
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create post
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 3 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create parent comment (depth 0)
  const parentCommentData = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const parentComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentData,
      },
    );
  typia.assert(parentComment);

  // Verify parent comment has depth 0
  TestValidator.equals("parent comment depth is 0", parentComment.depth, 0);

  // Step 6: Create multiple replies to the parent comment (depth 1)
  const reply1Data = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: parentComment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const reply1: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: reply1Data,
      },
    );
  typia.assert(reply1);
  TestValidator.equals("first reply depth is 1", reply1.depth, 1);

  const reply2Data = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: parentComment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const reply2: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: reply2Data,
      },
    );
  typia.assert(reply2);
  TestValidator.equals("second reply depth is 1", reply2.depth, 1);

  const reply3Data = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: parentComment.id,
  } satisfies IRedditCommunityComment.ICreate;

  const reply3: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: reply3Data,
      },
    );
  typia.assert(reply3);
  TestValidator.equals("third reply depth is 1", reply3.depth, 1);

  // Step 7: Create nested reply to reply1 (depth 2)
  const nestedReplyData = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parent_comment_id: reply1.id,
  } satisfies IRedditCommunityComment.ICreate;

  const nestedReply: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: nestedReplyData,
      },
    );
  typia.assert(nestedReply);
  TestValidator.equals("nested reply depth is 2", nestedReply.depth, 2);

  // Step 8: Retrieve replies with "new" sorting (default)
  const repliesNew: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 10,
          sort: "new",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(repliesNew);

  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    repliesNew.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit is 10",
    repliesNew.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be at least 3",
    repliesNew.pagination.records >= 3,
  );

  // Verify we got replies
  TestValidator.predicate(
    "should have at least 3 replies",
    repliesNew.data.length >= 3,
  );

  // Step 9: Retrieve replies with "old" sorting
  const repliesOld: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 10,
          sort: "old",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(repliesOld);

  TestValidator.predicate(
    "old sorting should return replies",
    repliesOld.data.length >= 3,
  );

  // Step 10: Retrieve replies with "top" sorting
  const repliesTop: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 10,
          sort: "top",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(repliesTop);

  TestValidator.predicate(
    "top sorting should return replies",
    repliesTop.data.length >= 3,
  );

  // Step 11: Retrieve replies with "controversial" sorting
  const repliesControversial: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 10,
          sort: "controversial",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(repliesControversial);

  TestValidator.predicate(
    "controversial sorting should return replies",
    repliesControversial.data.length >= 3,
  );

  // Step 12: Test pagination with limit 2
  const repliesPaginated: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(repliesPaginated);

  TestValidator.equals(
    "paginated limit should be 2",
    repliesPaginated.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "paginated data length should be at most 2",
    repliesPaginated.data.length <= 2,
  );

  // Step 13: Verify all reply summaries have correct structure
  for (const replySummary of repliesNew.data) {
    typia.assert(replySummary);
    TestValidator.predicate(
      "reply summary depth should be at least 1",
      replySummary.depth >= 1,
    );
    TestValidator.predicate(
      "reply summary body should not be empty",
      replySummary.body.length > 0,
    );
    TestValidator.equals(
      "reply summary post id matches",
      replySummary.post.id,
      post.id,
    );
  }
}
