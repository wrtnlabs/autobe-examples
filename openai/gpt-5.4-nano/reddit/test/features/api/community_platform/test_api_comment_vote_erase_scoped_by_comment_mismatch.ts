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

export async function test_api_comment_vote_erase_scoped_by_comment_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment1 =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId },
        body: {
          bodyText: typia.random<string>(),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment1);
  const commentId1 = comment1.id;
  const voteOnComment1 =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberAConnection,
      {
        params: { postId, commentId: commentId1 },
        body: {
          vote_direction: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(voteOnComment1);
  const voteIdA = voteOnComment1.id;
  const comment2 =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId },
        body: {
          bodyText: typia.random<string>(),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment2);
  const commentId2 = comment2.id;
  const voteOnComment2 =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberAConnection,
      {
        params: { postId, commentId: commentId2 },
        body: {
          vote_direction: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(voteOnComment2);
  const voteIdB = voteOnComment2.id;
  await TestValidator.error(
    "should reject deleting vote scoped with mismatched commentId",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.votes.eraseCommentVote(
        memberAConnection,
        {
          postId,
          commentId: commentId2,
          voteId: voteIdA,
        },
      );
    },
  );
  await api.functional.communityPlatform.member.posts.comments.votes.eraseCommentVote(
    memberAConnection,
    {
      postId,
      commentId: commentId1,
      voteId: voteIdA,
    },
  );
  await api.functional.communityPlatform.member.posts.comments.votes.eraseCommentVote(
    memberAConnection,
    {
      postId,
      commentId: commentId2,
      voteId: voteIdB,
    },
  );
}
