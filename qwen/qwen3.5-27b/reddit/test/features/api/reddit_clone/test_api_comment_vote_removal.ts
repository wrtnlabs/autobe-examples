import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test comment vote removal scenario.
 * 1. Register voter and comment author
 * 2. Comment author creates community, post, and comment
 * 3. Voter downvotes the comment (score becomes -1)
 * 4. Voter removes their vote (value=0)
 * 5. Validate vote removal: score returns to 0, karma increases by 1
 */
export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register voter (member who will cast and remove vote)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
      display_name: typia.random<
        string & tags.MinLength<3> & tags.MaxLength<50>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Register comment author (member who will create the comment)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
      display_name: typia.random<
        string & tags.MinLength<3> & tags.MaxLength<50>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 3. Comment author creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Comment author creates a post in their community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Comment author creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {},
      },
    );
  typia.assert(comment);
  // Store initial karma of comment author
  const initialAuthorKarma = comment.author.karma;
  // 6. Voter casts a downvote (value=-1) on the comment
  const downvoteResult =
    await api.functional.redditClone.member.posts.comments.vote(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { value: -1 } satisfies IRedditCloneComment.IVote,
      },
    );
  typia.assert(downvoteResult);
  // Validate downvote was successful
  TestValidator.equals("downvote value", downvoteResult.voteValue, -1);
  TestValidator.equals(
    "comment score after downvote",
    downvoteResult.commentScore,
    -1,
  );
  TestValidator.equals(
    "karma change on downvote",
    downvoteResult.karmaChange,
    -1,
  );
  // 7. Voter removes their vote by submitting value=0
  const removalResult =
    await api.functional.redditClone.member.posts.comments.vote(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { value: 0 } satisfies IRedditCloneComment.IVote,
      },
    );
  typia.assert(removalResult);
  // 8. Validate vote removal
  TestValidator.equals("vote value after removal", removalResult.voteValue, 0);
  TestValidator.equals(
    "comment score after removal",
    removalResult.commentScore,
    0,
  );
  TestValidator.equals("karma change on removal", removalResult.karmaChange, 1);
  // Verify comment author's karma increased by 1 (from -1 back to 0)
  TestValidator.predicate(
    "author karma increased by 1 after vote removal",
    removalResult.commentAuthor.karma === initialAuthorKarma + 1,
  );
}