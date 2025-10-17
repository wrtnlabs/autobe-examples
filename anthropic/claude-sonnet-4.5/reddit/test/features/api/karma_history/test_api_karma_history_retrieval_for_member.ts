import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeKarmaHistory";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeKarmaHistory";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

export async function test_api_karma_history_retrieval_for_member(
  connection: api.IConnection,
) {
  // Phase 1: Create primary member whose karma history will be tested
  const primaryMemberPassword = RandomGenerator.alphaNumeric(10);
  const primaryMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: primaryMemberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(primaryMember);

  // Save primary member's authorization token
  const primaryMemberToken = primaryMember.token.access;

  // Phase 2: Create community and content
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Create multiple posts
  const posts = await ArrayUtil.asyncRepeat(4, async () => {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Create multiple comments on posts
  const comments = await ArrayUtil.asyncRepeat(4, async (index) => {
    const comment = await api.functional.redditLike.member.comments.create(
      connection,
      {
        body: {
          reddit_like_post_id: posts[index % posts.length].id,
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
    typia.assert(comment);
    return comment;
  });

  // Phase 3: Create voter accounts and generate karma events
  const voter1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter1);

  // Voter 1: Upvote first 2 posts
  await ArrayUtil.asyncForEach(posts.slice(0, 2), async (post) => {
    const vote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          vote_value: 1,
        } satisfies IRedditLikePostVote.ICreate,
      },
    );
    typia.assert(vote);
  });

  // Voter 1: Upvote first 2 comments
  await ArrayUtil.asyncForEach(comments.slice(0, 2), async (comment) => {
    const vote = await api.functional.redditLike.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: 1,
        } satisfies IRedditLikeCommentVote.ICreate,
      },
    );
    typia.assert(vote);
  });

  // Create voter 2
  const voter2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter2);

  // Voter 2: Downvote post 3
  const downvotePost =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: posts[2].id,
      body: {
        vote_value: -1,
      } satisfies IRedditLikePostVote.ICreate,
    });
  typia.assert(downvotePost);

  // Voter 2: Upvote comment 3
  const upvoteComment = await api.functional.redditLike.comments.votes.create(
    connection,
    {
      commentId: comments[2].id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(upvoteComment);

  // Voter 2: Change vote on comment 3 from upvote to downvote
  const changedVote = await api.functional.redditLike.comments.votes.create(
    connection,
    {
      commentId: comments[2].id,
      body: {
        vote_value: -1,
      } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(changedVote);

  // Create voter 3
  const voter3 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter3);

  // Voter 3: Upvote last post and comment
  await api.functional.redditLike.member.posts.votes.create(connection, {
    postId: posts[3].id,
    body: {
      vote_value: 1,
    } satisfies IRedditLikePostVote.ICreate,
  });

  await api.functional.redditLike.comments.votes.create(connection, {
    commentId: comments[3].id,
    body: {
      vote_value: 1,
    } satisfies IRedditLikeCommentVote.ICreate,
  });

  // Phase 4: Restore primary member authentication and retrieve karma history
  connection.headers = connection.headers || {};
  connection.headers.Authorization = primaryMemberToken;

  // Phase 4.1: Basic retrieval without filters
  const allKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(allKarmaHistory);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    allKarmaHistory.pagination.current === 1,
  );
  TestValidator.predicate(
    "karma history should contain records",
    allKarmaHistory.data.length > 0,
  );

  // Validate each karma history record structure
  await ArrayUtil.asyncForEach(allKarmaHistory.data, async (record) => {
    typia.assert(record);
    TestValidator.predicate(
      "karma_type should be post or comment",
      record.karma_type === "post" || record.karma_type === "comment",
    );
    TestValidator.predicate(
      "change_amount should be a valid integer",
      Number.isInteger(record.change_amount),
    );
    TestValidator.predicate(
      "triggered_by_vote_action should be non-empty",
      record.triggered_by_vote_action.length > 0,
    );
  });

  // Calculate total karma from history
  const postKarmaSum = allKarmaHistory.data
    .filter((record) => record.karma_type === "post")
    .reduce((sum, record) => sum + record.change_amount, 0);
  const commentKarmaSum = allKarmaHistory.data
    .filter((record) => record.karma_type === "comment")
    .reduce((sum, record) => sum + record.change_amount, 0);

  // Phase 4.2: Filter by post karma type
  const postKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 1,
          limit: 20,
          karma_type: "post",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(postKarmaHistory);

  // Validate all records are post karma
  await ArrayUtil.asyncForEach(postKarmaHistory.data, async (record) => {
    TestValidator.equals(
      "filtered karma type should be post",
      record.karma_type,
      "post",
    );
  });

  // Phase 4.3: Filter by comment karma type
  const commentKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 1,
          limit: 20,
          karma_type: "comment",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(commentKarmaHistory);

  // Validate all records are comment karma
  await ArrayUtil.asyncForEach(commentKarmaHistory.data, async (record) => {
    TestValidator.equals(
      "filtered karma type should be comment",
      record.karma_type,
      "comment",
    );
  });

  // Phase 4.4: Test pagination with smaller limit
  const paginatedKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(paginatedKarmaHistory);

  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedKarmaHistory.data.length <= 5,
  );
  TestValidator.equals(
    "pagination limit should match request",
    paginatedKarmaHistory.pagination.limit,
    5,
  );

  // Verify chronological ordering (assuming descending order by created_at)
  if (allKarmaHistory.data.length > 1) {
    const timestamps = allKarmaHistory.data.map((record) =>
      new Date(record.created_at).getTime(),
    );
    for (let i = 0; i < timestamps.length - 1; i++) {
      TestValidator.predicate(
        "karma history should be in chronological order",
        timestamps[i] >= timestamps[i + 1],
      );
    }
  }
}
