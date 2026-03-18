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
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_vote_erase_own_vote_persists_cleanup(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const postCreate = await prepare_random_community_platform_post();
  // Create a post. This SDK function returns void.
  await api.functional.communityPlatform.member.posts.create(memberConnection, {
    body: {
      community_id: postCreate.community_id,
      post_type: postCreate.post_type,
      title: postCreate.title,
      body_text: postCreate.body_text,
    } satisfies ICommunityPlatformPost.ICreate,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentCreate =
    await prepare_random_community_platform_post_vote_comment();
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId,
        body: {
          bodyText: commentCreate.bodyText,
          parentCommentId: commentCreate.parentCommentId ?? null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment);
  const voteCreate = await prepare_random_community_platform_comment_vote();
  const vote =
    await api.functional.communityPlatform.member.posts.comments.votes.create(
      memberConnection,
      {
        postId,
        commentId: comment.id,
        body: {
          vote_direction: voteCreate.vote_direction,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  await api.functional.communityPlatform.member.posts.comments.votes.eraseCommentVote(
    memberConnection,
    {
      postId,
      commentId: comment.id,
      voteId: vote.id,
    },
  );
  await TestValidator.error(
    "vote should be deleted and second erase should fail",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.votes.eraseCommentVote(
        memberConnection,
        {
          postId,
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );
}
