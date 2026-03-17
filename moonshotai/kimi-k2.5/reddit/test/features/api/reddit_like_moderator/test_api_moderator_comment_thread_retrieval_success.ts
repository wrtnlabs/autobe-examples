import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_moderator_comment_thread_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized: IRedditLikeModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderatorAuthorized);
  // Step 2: Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: IRedditLikeMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(memberAuthorized);
  // Step 3: Create a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 4: Subscribe to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 5: Create a post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        community_id: community.id,
      },
    });
  typia.assert(post);
  // Step 6: Create multiple comments with nested replies
  // Create top-level comments
  const topLevelComment1: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(topLevelComment1);
  const topLevelComment2: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(topLevelComment2);
  // Create nested replies
  const nestedReply1: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          parentId: topLevelComment1.id,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(nestedReply1);
  const nestedReply2: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          parentId: topLevelComment1.id,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(nestedReply2);
  const deepNestedReply: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          parentId: nestedReply1.id,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(deepNestedReply);
  // Step 7: Add votes to comments to establish vote scores
  // Create voter members and have them vote on comments
  const voterConnection1: api.IConnection = { host: connection.host };
  const voter1: IRedditLikeMember.IAuthorized = await authorize_member_join(
    voterConnection1,
    {},
  );
  typia.assert(voter1);
  // Subscribe voter to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    voterConnection1,
    {
      communityId: community.id,
    },
  );
  // Vote up on topLevelComment1
  const upvote1: IRedditLikeVote =
    await generate_random_reddit_like_member_comments_votes_create(
      voterConnection1,
      {
        body: {
          vote_type: "upvote",
        },
        params: {
          commentId: topLevelComment1.id,
        },
      },
    );
  typia.assert(upvote1);
  const voterConnection2: api.IConnection = { host: connection.host };
  const voter2: IRedditLikeMember.IAuthorized = await authorize_member_join(
    voterConnection2,
    {},
  );
  typia.assert(voter2);
  await api.functional.redditLike.member.communities.subscriptions.create(
    voterConnection2,
    {
      communityId: community.id,
    },
  );
  const upvote2: IRedditLikeVote =
    await generate_random_reddit_like_member_comments_votes_create(
      voterConnection2,
      {
        body: {
          vote_type: "upvote",
        },
        params: {
          commentId: topLevelComment1.id,
        },
      },
    );
  typia.assert(upvote2);
  // Vote up on nestedReply1
  const upvote3: IRedditLikeVote =
    await generate_random_reddit_like_member_comments_votes_create(
      voterConnection1,
      {
        body: {
          vote_type: "upvote",
        },
        params: {
          commentId: nestedReply1.id,
        },
      },
    );
  typia.assert(upvote3);
  // Step 8: Call the target endpoint as moderator to retrieve the complete threaded discussion
  const thread: IRedditLikeComment.IThread =
    await api.functional.redditLike.moderator.posts.comments.thread(
      moderatorConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(thread);
  // Step 9: Verify the response - check hierarchical structure
  TestValidator.predicate("thread has comments", thread.replies.length > 0);
  // Verify all comment IDs are present
  const allCommentIds = [
    topLevelComment1.id,
    topLevelComment2.id,
    nestedReply1.id,
    nestedReply2.id,
    deepNestedReply.id,
  ];
  // Helper function to flatten thread
  const flattenThread = (comment: IRedditLikeComment.IThread): string[] => {
    const ids = [comment.id];
    for (const reply of comment.replies) {
      ids.push(...flattenThread(reply));
    }
    return ids;
  };
  const threadIds = thread.replies.flatMap(flattenThread);
  TestValidator.equals(
    "all comments present",
    threadIds.sort(),
    allCommentIds.sort(),
  );
  // Step 10: Verify nested replies are properly organized
  const findCommentInThread = (
    threadComments: IRedditLikeComment.IThread[],
    commentId: string,
  ): IRedditLikeComment.IThread | null => {
    for (const comment of threadComments) {
      if (comment.id === commentId) {
        return comment;
      }
      const found = findCommentInThread(comment.replies, commentId);
      if (found) {
        return found;
      }
    }
    return null;
  };
  const topComment1InThread = findCommentInThread(
    thread.replies,
    topLevelComment1.id,
  );
  TestValidator.predicate(
    "topLevelComment1 exists",
    topComment1InThread !== null,
  );
  if (topComment1InThread) {
    // Check that nested replies are under topLevelComment1
    const nestedReplyIds = topComment1InThread.replies.map((r) => r.id);
    TestValidator.predicate(
      "nestedReply1 is under topLevelComment1",
      nestedReplyIds.includes(nestedReply1.id),
    );
    TestValidator.predicate(
      "nestedReply2 is under topLevelComment1",
      nestedReplyIds.includes(nestedReply2.id),
    );
    // Check deep nested reply is under nestedReply1
    const nestedReply1InThread = findCommentInThread(
      topComment1InThread.replies,
      nestedReply1.id,
    );
    TestValidator.predicate(
      "nestedReply1 exists in thread",
      nestedReply1InThread !== null,
    );
    if (nestedReply1InThread) {
      TestValidator.predicate(
        "deepNestedReply is under nestedReply1",
        nestedReply1InThread.replies.some((r) => r.id === deepNestedReply.id),
      );
    }
  }
  // Step 11: Verify sorting by Best (highest vote score first) at each level
  if (thread.replies.length > 1) {
    for (let i = 0; i < thread.replies.length - 1; i++) {
      const current = thread.replies[i];
      const next = thread.replies[i + 1];
      TestValidator.predicate(
        "top level comments sorted by best",
        current.voteScore >= next.voteScore,
      );
    }
  }
  // Step 12: Verify author information is included for each comment
  const verifyAuthorInfo = (comment: IRedditLikeComment.IThread): void => {
    TestValidator.predicate(
      `comment ${comment.id} has author id`,
      typeof comment.author.id === "string",
    );
    TestValidator.predicate(
      `comment ${comment.id} has author username`,
      typeof comment.author.username === "string",
    );
    TestValidator.predicate(
      `comment ${comment.id} has author email`,
      typeof comment.author.email === "string",
    );
    for (const reply of comment.replies) {
      verifyAuthorInfo(reply);
    }
  };
  for (const reply of thread.replies) {
    verifyAuthorInfo(reply);
  }
  // Step 13: Verify vote scores and timestamps are present
  const verifyMetadata = (comment: IRedditLikeComment.IThread): void => {
    TestValidator.predicate(
      `comment ${comment.id} has voteScore`,
      typeof comment.voteScore === "number",
    );
    TestValidator.predicate(
      `comment ${comment.id} has createdAt`,
      typeof comment.createdAt === "string",
    );
    TestValidator.predicate(
      `comment ${comment.id} has isEdited flag`,
      typeof comment.isEdited === "boolean",
    );
    TestValidator.predicate(
      `comment ${comment.id} has isDeleted flag`,
      typeof comment.isDeleted === "boolean",
    );
    for (const reply of comment.replies) {
      verifyMetadata(reply);
    }
  };
  for (const reply of thread.replies) {
    verifyMetadata(reply);
  }
}
