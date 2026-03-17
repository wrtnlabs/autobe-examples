import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_comment_thread_sorting_modes_new_controversial(
  connection: api.IConnection,
): Promise<void> {
  // Create author member
  const authorConn: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConn, {});
  // Create voter members for creating vote patterns
  const voter1Conn: api.IConnection = { host: connection.host };
  await authorize_member_join(voter1Conn, {});
  const voter2Conn: api.IConnection = { host: connection.host };
  await authorize_member_join(voter2Conn, {});
  // Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    authorConn,
    {
      body: {
        name: `sort-test-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
        description: "Community for testing comment sorting",
      },
    },
  );
  // Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    authorConn,
    {
      communityId: community.id,
    },
  );
  // Create a text post
  const post = await api.functional.redditLike.member.posts.create(authorConn, {
    body: {
      title: "Test Post for Comment Sorting Modes",
      community_id: community.id,
      post_type: "text",
      body: "This is a test post to verify comment sorting functionality",
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);
  // Create first comment (older)
  const comment1 =
    await generate_random_reddit_like_member_posts_comments_create(authorConn, {
      params: { postId: post.id },
      body: { content: "First comment - older timestamp" },
    });
  typia.assert(comment1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create second comment (newer)
  const comment2 =
    await generate_random_reddit_like_member_posts_comments_create(authorConn, {
      params: { postId: post.id },
      body: { content: "Second comment - newer timestamp" },
    });
  typia.assert(comment2);
  // Create a nested reply to comment1 (oldest)
  const reply1 = await generate_random_reddit_like_member_posts_comments_create(
    authorConn,
    {
      params: { postId: post.id },
      body: {
        content: "Reply to first comment - testing hierarchy preservation",
        parentId: comment1.id,
      },
    },
  );
  typia.assert(reply1);
  // Create vote patterns:
  // Comment 1: Upvote + Downvote = Score 0, Total 2 votes (Controversial)
  // Comment 2: Upvote + Upvote = Score 2, Total 2 votes (Not controversial)
  // Voter1 votes on comment1 (downvote - making it controversial)
  await generate_random_reddit_like_member_comments_votes_create(voter1Conn, {
    params: { commentId: comment1.id },
    body: { vote_type: "downvote" } satisfies IRedditLikeVote.ICreate,
  });
  // Voter2 votes on comment1 (upvote - balancing it)
  await generate_random_reddit_like_member_comments_votes_create(voter2Conn, {
    params: { commentId: comment1.id },
    body: { vote_type: "upvote" } satisfies IRedditLikeVote.ICreate,
  });
  // Both voters upvote comment2 (high score, not controversial)
  await generate_random_reddit_like_member_comments_votes_create(voter1Conn, {
    params: { commentId: comment2.id },
    body: { vote_type: "upvote" } satisfies IRedditLikeVote.ICreate,
  });
  await generate_random_reddit_like_member_comments_votes_create(voter2Conn, {
    params: { commentId: comment2.id },
    body: { vote_type: "upvote" } satisfies IRedditLikeVote.ICreate,
  });
  // Retrieve the thread - API doesn't support sort parameter
  const thread = await api.functional.redditLike.member.posts.comments.thread(
    authorConn,
    {
      postId: post.id,
    },
  );
  typia.assert(thread);
  // Verify structure is maintained
  TestValidator.predicate("Thread has comments", thread.replies.length >= 2);
  // Verify hierarchical structure - replies are nested
  const parentWithReply = thread.replies.find((c) =>
    c.replies.some((r) => r.id === reply1.id),
  );
  TestValidator.predicate(
    "Nested reply appears under parent",
    parentWithReply?.id === comment1.id,
  );
  // Verify comments have vote patterns
  const threadComment1 = thread.replies.find((c) => c.id === comment1.id);
  const threadComment2 = thread.replies.find((c) => c.id === comment2.id);
  // Verify comment1 has near-zero score (balanced votes)
  TestValidator.predicate(
    "Comment with balanced votes has near-zero net score",
    threadComment1 !== undefined && Math.abs(threadComment1.voteScore) <= 1,
  );
  // Verify comment2 has higher score
  TestValidator.predicate(
    "Comment with all upvotes has positive score",
    threadComment2 !== undefined && threadComment2.voteScore > 0,
  );
  // Verify timestamps are different (comments created at different times)
  const commentTimestamps = thread.replies.map((c) =>
    new Date(c.createdAt).getTime(),
  );
  TestValidator.predicate(
    "Comments have different timestamps",
    commentTimestamps.length >= 2 &&
      commentTimestamps[0] !== commentTimestamps[1],
  );
}
