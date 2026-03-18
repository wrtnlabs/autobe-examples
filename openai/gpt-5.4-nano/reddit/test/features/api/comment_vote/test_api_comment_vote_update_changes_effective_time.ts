import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_vote_update_changes_effective_time(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community_id = typia.random<string & tags.Format<"uuid">>();
  // SDK post creation returns void in this SDK, so we cannot obtain post.id.
  // Use deterministic random ids only for request typing/compilation.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id,
        post_type: "text",
        title: RandomGenerator.name(2),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  await generate_random_community_platform_member_posts_comments_create(
    memberConnection,
    {
      params: { postId },
      body: {
        bodyText: RandomGenerator.paragraph({ sentences: 2 }),
        parentCommentId: null,
      } satisfies ICommunityPlatformPostVoteComment.ICreate,
    },
  );
  const upvote =
    await api.functional.communityPlatform.member.posts.comments.votes.patchByPostidAndCommentid(
      memberConnection,
      {
        postId,
        commentId,
        body: {
          direction: 1,
          page: null,
          limit: null,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(upvote);
  const downvote =
    await api.functional.communityPlatform.member.posts.comments.votes.patchByPostidAndCommentid(
      memberConnection,
      {
        postId,
        commentId,
        body: {
          direction: -1,
          page: null,
          limit: null,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("deletedAt remains null", downvote.deletedAt, null);
  TestValidator.equals("same voter id", downvote.voter.id, upvote.voter.id);
  TestValidator.equals(
    "same voter display_name",
    downvote.voter.display_name,
    upvote.voter.display_name,
  );
  TestValidator.notEquals(
    "voteDirection changed",
    downvote.voteDirection,
    upvote.voteDirection,
  );
  TestValidator.predicate(
    "votedAt updated later",
    new Date(downvote.votedAt).getTime() > new Date(upvote.votedAt).getTime(),
  );
  TestValidator.predicate(
    "updatedAt updated later",
    new Date(downvote.updatedAt).getTime() >
      new Date(upvote.updatedAt).getTime(),
  );
  const downvoteAgain =
    await api.functional.communityPlatform.member.posts.comments.votes.patchByPostidAndCommentid(
      memberConnection,
      {
        postId,
        commentId,
        body: {
          direction: -1,
          page: null,
          limit: null,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(downvoteAgain);
  TestValidator.equals(
    "voteDirection still downvote",
    downvoteAgain.voteDirection,
    downvote.voteDirection,
  );
  TestValidator.equals("deletedAt remains null", downvoteAgain.deletedAt, null);
  TestValidator.equals(
    "voter still same",
    downvoteAgain.voter.id,
    downvote.voter.id,
  );
  TestValidator.predicate(
    "votedAt not earlier than previous downvote",
    new Date(downvoteAgain.votedAt).getTime() >=
      new Date(downvote.votedAt).getTime(),
  );
  TestValidator.predicate(
    "updatedAt not earlier than previous downvote",
    new Date(downvoteAgain.updatedAt).getTime() >=
      new Date(downvote.updatedAt).getTime(),
  );
}
