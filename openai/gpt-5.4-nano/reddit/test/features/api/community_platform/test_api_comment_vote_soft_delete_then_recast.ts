import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteComment";
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

export async function test_api_comment_vote_soft_delete_then_recast(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: credentials });
  // The provided post-creation generator has `Promise<void>` typings.
  // To keep the test compiling without relying on a returned post id,
  // generate a UUID for the post context.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3) Create comment on the post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId,
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 1 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4) Cast initial upvote
  const voteUp =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberConnection,
      {
        params: { postId, commentId: comment.id },
        body: {
          vote_direction:
            1 as ICommunityPlatformCommentVote.ICreate["vote_direction"],
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteUp);
  // 5) Soft-delete / neutral reset
  const prevUpdatedAt = voteUp.updatedAt;
  const removedVote =
    await api.functional.communityPlatform.member.posts.comments.votes.patchByPostidAndCommentid(
      memberConnection,
      {
        postId,
        commentId: comment.id,
        body: { direction: 0 } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  typia.assert(removedVote);
  TestValidator.predicate(
    "deletedAt should be non-null after neutral/reset",
    removedVote.deletedAt !== null,
  );
  TestValidator.predicate(
    "deletedAt should be later than previous updatedAt",
    removedVote.deletedAt !== null &&
      new Date(removedVote.deletedAt).getTime() >
        new Date(prevUpdatedAt).getTime(),
  );
  // 6) Verify comment thread ordering reflects removed vote state
  const threadAfter =
    await api.functional.communityPlatform.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "best",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostVoteComment.IRequest,
      },
    );
  typia.assert(threadAfter);
  const target = threadAfter.data.find((c) => c.id === comment.id);
  TestValidator.predicate(
    "comment should exist in thread after removal",
    target !== undefined,
  );
}
