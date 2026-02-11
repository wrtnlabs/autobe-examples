import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_vote_comment_upvote_then_change(
  connection: api.IConnection,
): Promise<void> {
  // Member authentication using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // Create a community - using mock data since communities API is not available
  const community = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 1 }),
  };
  // Create a post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "TEXT",
        content: RandomGenerator.paragraph({ sentences: 3 }),
        communityId: community.id,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create a comment on the post
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 1: Upvote the comment
  const upvote = await api.functional.redditPlatform.member.votes.update(
    memberConnection,
    {
      body: {
        comment_id: comment.id,
        vote_type: "UPVOTE",
      } satisfies IRedditPlatformCommentVote.IRequest,
    },
  );
  typia.assert(upvote);
  // Verify upvote: vote_score should be +1
  TestValidator.equals("upvote vote_type", upvote.vote_type, "UPVOTE");
  TestValidator.equals("upvote vote_score", upvote.vote_score, 1);
  // Step 2: Change vote to DOWNVOTE
  const downvote = await api.functional.redditPlatform.member.votes.update(
    memberConnection,
    {
      body: {
        comment_id: comment.id,
        vote_type: "DOWNVOTE",
      } satisfies IRedditPlatformCommentVote.IRequest,
    },
  );
  typia.assert(downvote);
  // Verify downvote: vote_score should be 0 (from +1 to -1 = 0)
  TestValidator.equals("downvote vote_type", downvote.vote_type, "DOWNVOTE");
  TestValidator.equals("downvote vote_score", downvote.vote_score, 0);
  // Step 3: Remove vote (NONE)
  const removeVote = await api.functional.redditPlatform.member.votes.update(
    memberConnection,
    {
      body: {
        comment_id: comment.id,
        vote_type: "NONE",
      } satisfies IRedditPlatformCommentVote.IRequest,
    },
  );
  typia.assert(removeVote);
  // Verify removal: vote_score should be -1 (from 0 to -1)
  TestValidator.equals("removeVote vote_type", removeVote.vote_type, "NONE");
  TestValidator.equals("removeVote vote_score", removeVote.vote_score, -1);
}
