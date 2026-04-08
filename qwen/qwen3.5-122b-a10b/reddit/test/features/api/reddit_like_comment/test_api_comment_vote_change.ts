import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_comment_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(voter);
  // 2. Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // 3. Author creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 4. Author creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Author creates a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Voter casts an upvote on the comment
  const upvote = await generate_random_reddit_like_member_comments_votes_create(
    voterConnection,
    {
      body: {
        vote_type: "upvote",
      },
      params: {
        commentId: comment.id,
      },
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote vote type", upvote.vote_type, "upvote");
  TestValidator.equals(
    "upvote comment reference",
    upvote.comment?.id,
    comment.id,
  );
  // 7. Voter changes vote to downvote on the same comment
  const downvote =
    await generate_random_reddit_like_member_comments_votes_create(
      voterConnection,
      {
        body: {
          vote_type: "downvote",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(downvote);
  TestValidator.equals("downvote vote type", downvote.vote_type, "downvote");
  TestValidator.equals(
    "downvote comment reference",
    downvote.comment?.id,
    comment.id,
  );
  TestValidator.notEquals(
    "vote type changed",
    upvote.vote_type,
    downvote.vote_type,
  );
  // 8. Verify the vote was updated (same vote record, different type)
  // The vote ID should be the same since it's an update, not a new vote
  TestValidator.equals("vote updated not duplicated", upvote.id, downvote.id);
}
