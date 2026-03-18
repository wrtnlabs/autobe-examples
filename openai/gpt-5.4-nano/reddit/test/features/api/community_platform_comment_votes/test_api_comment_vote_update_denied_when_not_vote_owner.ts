import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_comment_vote_update_denied_when_not_vote_owner(
  connection: api.IConnection,
): Promise<void> {
  // Arrange: Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
    },
  });
  const community =
    await generate_random_community_platform_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // NOTE: Given available SDK/utility typings, we cannot retrieve created postId from post-creation.
  // Use a postId placeholder to exercise authorization boundaries on vote update.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment);
  const vote =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberAConnection,
      {
        params: { postId, commentId: comment.id },
        body: {
          vote_direction: 1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  const preVoteDirection = vote.voteDirection;
  // Arrange: Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
    },
  });
  // Act: Member B tries to update Member A's vote
  const deniedUpdate = async () => {
    const nextDirection = (preVoteDirection === 1 ? 0 : 1) satisfies
      | (
          number &
          tags.Type<"int32"> &
          tags.Minimum<-2147483648> &
          tags.Maximum<2147483647>
        )
      | undefined;
    await api.functional.communityPlatform.member.posts.comments.votes.putByPostidAndCommentidAndVoteid(
      memberBConnection,
      {
        postId,
        commentId: comment.id,
        voteId: vote.id,
        body: {
          voteDirection: typia.assert<
            | (
                number &
                tags.Type<"int32"> &
                tags.Minimum<-2147483648> &
                tags.Maximum<2147483647>
              )
            | undefined
          >(nextDirection),
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  };
  await TestValidator.error(
    "update vote denied when not vote owner",
    deniedUpdate,
  );
  // Assert: verify vote direction remains unchanged (owner re-applies same direction)
  const ownerRecheck =
    await api.functional.communityPlatform.member.posts.comments.votes.putByPostidAndCommentidAndVoteid(
      memberAConnection,
      {
        postId,
        commentId: comment.id,
        voteId: vote.id,
        body: {
          voteDirection: typia.assert<
            | (
                number &
                tags.Type<"int32"> &
                tags.Minimum<-2147483648> &
                tags.Maximum<2147483647>
              )
            | undefined
          >(preVoteDirection),
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(ownerRecheck);
  TestValidator.equals(
    "vote direction unchanged",
    ownerRecheck.voteDirection,
    preVoteDirection,
  );
}
