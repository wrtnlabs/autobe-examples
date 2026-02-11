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

export async function test_api_vote_comment_type_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Use the member's connection directly for subsequent operations
  const memberSession: api.IConnection = { host: connection.host };
  memberSession.headers = { Authorization: member.token.access };
  // 2. Create a post in a community (using a hardcoded community ID since we can't create communities)
  const post = await api.functional.redditPlatform.member.posts.create(
    memberSession,
    {
      body: {
        communityId: "d0c4e9f7-4a8b-4c9d-8e1f-2a3b4c5d6e7f" as string &
          tags.Format<"uuid">,
        title: RandomGenerator.name(),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberSession,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Vote UPVOTE on the comment - verify score becomes +1
  let vote1 = await api.functional.redditPlatform.member.votes.update(
    memberSession,
    {
      body: {
        comment_id: comment.id,
        vote_type: "UPVOTE" as const,
      } satisfies IRedditPlatformCommentVote.IRequest,
    },
  );
  typia.assert(vote1);
  TestValidator.equals("initial upvote score", 1, vote1.vote_score);
  // 5. Change vote to DOWNVOTE - verify score becomes -1 (net change of -2)
  let vote2 = await api.functional.redditPlatform.member.votes.update(
    memberSession,
    {
      body: {
        comment_id: comment.id,
        vote_type: "DOWNVOTE" as const,
      } satisfies IRedditPlatformCommentVote.IRequest,
    },
  );
  typia.assert(vote2);
  TestValidator.equals("after downvote score", -1, vote2.vote_score);
  // 6. Change vote to NONE - verify score reverts to 0
  let vote3 = await api.functional.redditPlatform.member.votes.update(
    memberSession,
    {
      body: {
        comment_id: comment.id,
        vote_type: "NONE" as const,
      } satisfies IRedditPlatformCommentVote.IRequest,
    },
  );
  typia.assert(vote3);
  TestValidator.equals("after none score", 0, vote3.vote_score);
  // 7. Vote UPVOTE again - verify score returns to +1
  let vote4 = await api.functional.redditPlatform.member.votes.update(
    memberSession,
    {
      body: {
        comment_id: comment.id,
        vote_type: "UPVOTE" as const,
      } satisfies IRedditPlatformCommentVote.IRequest,
    },
  );
  typia.assert(vote4);
  TestValidator.equals("after second upvote score", 1, vote4.vote_score);
}
