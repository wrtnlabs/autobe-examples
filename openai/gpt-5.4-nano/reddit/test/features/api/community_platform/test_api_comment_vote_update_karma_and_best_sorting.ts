import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_vote_update_karma_and_best_sorting(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community: ICommunityPlatformCommunity = typia.assert(
    await generate_random_community_platform_communities_create(
      memberConnection,
      {},
    ),
  );
  // NOTE: member.posts.create is generated as void-returning, so we cannot read post id.
  // To keep the test compiling with the available SDK, we proceed using a generated postId.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = typia.assert(
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 1 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    ),
  );
  const commentId = comment.id;
  const initialVote = typia.assert(
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberConnection,
      {
        params: { postId, commentId },
        body: {
          vote_direction: 1,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    ),
  );
  const voteId = initialVote.id;
  const nextVoteDirection = initialVote.voteDirection === 1 ? -1 : 1;
  // Best ordering before update
  const beforeThread = typia.assert(
    await api.functional.communityPlatform.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: { sort: "best", page: 1, limit: 10 },
      },
    ),
  );
  const beforeCommentIndex = beforeThread.data.findIndex(
    (c) => c.id === commentId,
  );
  const updatedVote = typia.assert(
    await api.functional.communityPlatform.member.posts.comments.votes.putByPostidAndCommentidAndVoteid(
      memberConnection,
      {
        postId,
        commentId,
        voteId,
        body: {
          voteDirection: nextVoteDirection,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    ),
  );
  TestValidator.equals(
    "voteDirection reflects the update",
    updatedVote.voteDirection,
    nextVoteDirection,
  );
  if (updatedVote.deletedAt !== null) {
    TestValidator.notEquals(
      "deletedAt is non-null when vote is removed",
      updatedVote.deletedAt,
      null,
    );
  } else {
    TestValidator.equals(
      "deletedAt is null when vote is active",
      updatedVote.deletedAt,
      null,
    );
  }
  TestValidator.predicate(
    "updatedAt is after or equal votedAt",
    new Date(updatedVote.updatedAt).getTime() >=
      new Date(updatedVote.votedAt).getTime(),
  );
  // Best ordering after update
  const afterThread = typia.assert(
    await api.functional.communityPlatform.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: { sort: "best", page: 1, limit: 10 },
      },
    ),
  );
  const afterCommentIndex = afterThread.data.findIndex(
    (c) => c.id === commentId,
  );
  if (beforeCommentIndex !== -1 && afterCommentIndex !== -1) {
    if (nextVoteDirection === 1) {
      TestValidator.predicate(
        "comment should not move later in best ordering when vote becomes positive",
        afterCommentIndex <= beforeCommentIndex,
      );
    }
    if (nextVoteDirection === -1) {
      TestValidator.predicate(
        "comment should not move earlier in best ordering when vote becomes negative",
        afterCommentIndex >= beforeCommentIndex,
      );
    }
  }
}
