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

export async function test_api_comment_vote_post_scoping_mismatch_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  const postA = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const postB = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  const postASummary = typia.assert<ICommunityPlatformPost.ISummary>(
    postA as unknown,
  );
  const postBSummary = typia.assert<ICommunityPlatformPost.ISummary>(
    postB as unknown,
  );
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: postASummary.id,
        },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  const commentSummary =
    typia.assert<ICommunityPlatformPostVoteComment>(comment);
  const commentInPostA_before = typia.assert<ICommunityPlatformComment>(
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      {
        postId: postASummary.id,
        commentId: commentSummary.id,
      },
    ),
  );
  await TestValidator.error(
    "reject vote when commentId does not belong to provided postId",
    async () => {
      await generate_random_community_platform_member_posts_comments_votes_create(
        memberConnection,
        {
          params: {
            postId: postBSummary.id,
            commentId: commentSummary.id,
          },
          body: {
            vote_direction: typia.random<number & tags.Type<"int32">>(),
          } satisfies ICommunityPlatformCommentVote.ICreate,
        },
      );
    },
  );
  const commentInPostA_after = typia.assert<ICommunityPlatformComment>(
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      {
        postId: postASummary.id,
        commentId: commentSummary.id,
      },
    ),
  );
  TestValidator.equals(
    "comment body unchanged",
    commentInPostA_after.body_text,
    commentInPostA_before.body_text,
  );
  TestValidator.equals(
    "comment deleted state unchanged",
    commentInPostA_after.deleted_at,
    commentInPostA_before.deleted_at,
  );
}
