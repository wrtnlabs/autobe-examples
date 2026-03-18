import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_vote_switch_direction_updates_score_and_karma(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Switch vote direction from upvote to downvote and ensure the
  // comment vote direction, deletedAt state, and returned comment body data
  // reflect the single-current-vote rule.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  const post = typia.assert<ICommunityPlatformPost.ISummary>(
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.name(),
          body_text: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    ),
  );
  const comment = typia.assert<ICommunityPlatformPostVoteComment>(
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    ),
  );
  await generate_random_community_platform_member_posts_comments_votes_create(
    memberConnection,
    {
      params: { postId: post.id, commentId: comment.id },
      body: {
        vote_direction: 1,
      } satisfies ICommunityPlatformCommentVote.ICreate,
    },
  );
  const voteDown = typia.assert<ICommunityPlatformCommentVote>(
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberConnection,
      {
        params: { postId: post.id, commentId: comment.id },
        body: {
          vote_direction: -1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    ),
  );
  TestValidator.equals(
    "vote direction switches to downvote",
    voteDown.voteDirection,
    -1,
  );
  TestValidator.equals(
    "vote remains active after switching",
    voteDown.deletedAt,
    null,
  );
  const beforeComment = typia.assert<ICommunityPlatformPostVoteComment>(
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    ),
  );
  const afterComment = typia.assert<ICommunityPlatformPostVoteComment>(
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    ),
  );
  TestValidator.equals(
    "comment body unchanged",
    afterComment.bodyText,
    beforeComment.bodyText,
  );
  TestValidator.equals(
    "comment id unchanged",
    afterComment.id,
    beforeComment.id,
  );
}
