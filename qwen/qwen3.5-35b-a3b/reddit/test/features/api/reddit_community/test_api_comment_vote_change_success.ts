import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_votes_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

export async function test_api_comment_vote_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate voter member (will cast votes)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voter);
  // 2. Authenticate comment author member (will create comment to be voted on)
  const authorConnection: api.IConnection = { host: connection.host };
  const commentAuthor = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(commentAuthor);
  // 3. Voter creates a post (comment will be on this post)
  const voterLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(voterLoginConnection, {
    body: {
      email: voter.email,
      password: "1234",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.ILogin,
  });
  const community = typia.random<IRedditCommunityCommunity.ISummary>();
  const post = await api.functional.redditCommunity.member.posts.create(
    voterLoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: community.id,
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Comment author creates a comment on the post
  const authorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(authorLoginConnection, {
    body: {
      email: commentAuthor.email,
      password: "1234",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.ILogin,
  });
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      authorLoginConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Voter casts initial upvote on the comment
  const voterVoteConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(voterVoteConnection, {
    body: {
      email: voter.email,
      password: "1234",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.ILogin,
  });
  const initialVote =
    await api.functional.redditCommunity.member.posts.comments.votes.create(
      voterVoteConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // 6. Verify initial upvote was recorded correctly
  TestValidator.equals(
    "initial vote type is upvote",
    initialVote.vote_type,
    "upvote",
  );
  // Verify comment has +1 score after upvote (from vote response's comment reference)
  TestValidator.equals(
    "comment vote_count is 1 after upvote",
    initialVote.comment.vote_count,
    1,
  );
  // 7. Voter changes vote from upvote to downvote (update existing vote)
  const updatedVote =
    await api.functional.redditCommunity.member.posts.comments.votes.create(
      voterVoteConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  // 8. Verify vote was updated correctly
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.notEquals(
    "vote updated_at changed after update",
    initialVote.updated_at,
    updatedVote.updated_at,
  );
  // Verify comment score changed to -1 after downvote
  TestValidator.equals(
    "comment vote_count is -1 after downvote",
    updatedVote.comment.vote_count,
    -1,
  );
  // Verify only one vote record exists (no duplicates)
  TestValidator.equals(
    "vote record author matches voter",
    updatedVote.author.id,
    voter.id,
  );
  TestValidator.equals(
    "vote record comment matches expected",
    updatedVote.comment.id,
    comment.id,
  );
}