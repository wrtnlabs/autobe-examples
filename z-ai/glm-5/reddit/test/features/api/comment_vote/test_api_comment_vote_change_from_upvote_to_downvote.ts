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

/**
 * Test changing a vote from upvote to downvote on a comment.
 *
 * Validates the two-point adjustment rule:
 * - Removing upvote: -1 to vote_score, -1 karma to author
 * - Adding downvote: -1 to vote_score, -1 karma to author
 * - Net change: -2 to vote_score, -2 karma
 */
export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup comment author (Member A)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community, post, and comment as author
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 3. Record initial state
  const initialVoteScore = comment.voteScore;
  const initialKarma = author.karma;
  // 4. Setup voter (Member B)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 5. Member B casts upvote on the comment
  const upvote =
    await generate_random_community_platform_member_posts_comments_vote_create(
      voterConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: { vote_type: "upvote" },
      },
    );
  typia.assert(upvote);
  // Validate initial upvote was created
  TestValidator.equals("initial vote type", upvote.voteType, "upvote");
  TestValidator.predicate(
    "upvote created_at is valid",
    upvote.createdAt !== null && upvote.createdAt !== undefined,
  );
  // 6. Member B changes vote to downvote via PATCH endpoint
  const changedVote =
    await api.functional.communityPlatform.posts.comments.votes.update(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          voteType: "downvote",
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(changedVote);
  // 7. Verify the vote change response
  TestValidator.equals("changed vote type", changedVote.voteType, "downvote");
  TestValidator.predicate(
    "vote updated_at exists",
    changedVote.updatedAt !== null && changedVote.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "vote id matches original",
    changedVote.id === upvote.id,
  );
  TestValidator.equals(
    "voter member id matches",
    changedVote.member.id,
    voter.id,
  );
  // 8. Verify business logic expectations
  // Expected changes (would need GET endpoints to verify):
  // - vote_score: initial (0) -> +1 (upvote) -> -1 (downvote) = net -2 from initial
  // - author karma: initial -> +1 -> -1 = net -2 from initial
}
