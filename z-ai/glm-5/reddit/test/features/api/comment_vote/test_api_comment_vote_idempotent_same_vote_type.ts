import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_vote_create } from "../../../generate/generate_random_community_platform_member_posts_comments_vote_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_idempotent_same_vote_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A (comment author) and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Create community as member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // Step 3: Create a post in the community as member A
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  // Step 4: Create a comment as member A
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  // Verify initial comment has vote_score of 0
  TestValidator.equals("initial comment vote score", comment.voteScore, 0);
  // Step 5: Create member B (voter) and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 6: Member B casts initial upvote on the comment
  const initialVote =
    await generate_random_community_platform_member_posts_comments_vote_create(
      memberBConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(initialVote);
  // Verify initial vote properties
  TestValidator.equals("initial vote type", initialVote.voteType, "upvote");
  TestValidator.equals("initial vote deleted_at", initialVote.deletedAt, null);
  // Record the initial updated_at timestamp
  const initialUpdatedAt = initialVote.updatedAt;
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 7: Member B resubmits the same upvote via PATCH endpoint
  const resubmittedVote =
    await api.functional.communityPlatform.posts.comments.votes.update(
      memberBConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          voteType: "upvote",
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(resubmittedVote);
  // Step 8: Verify idempotent behavior
  // The vote_type should remain 'upvote'
  TestValidator.equals(
    "resubmitted vote type",
    resubmittedVote.voteType,
    "upvote",
  );
  // The vote should still be active (not deleted)
  TestValidator.equals(
    "resubmitted vote deleted_at",
    resubmittedVote.deletedAt,
    null,
  );
  // The updated_at timestamp should be refreshed (newer than or equal to before)
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(resubmittedVote.updatedAt).getTime() >=
      new Date(initialUpdatedAt).getTime(),
  );
  // The vote ID should be the same (same vote record)
  TestValidator.equals("vote ID unchanged", resubmittedVote.id, initialVote.id);
}
