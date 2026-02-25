import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test vote state transitions on comments: upvoting, changing to downvote, and removing the vote entirely.
 *
 * **Setup:**
 * 1. First member (author) joins, creates a community, subscribes, creates a post, and creates a comment
 * 2. Second member (voter) joins and subscribes to the community
 *
 * **Test Execution - Phase 1: Initial Upvote**
 * 1. Second member sends PATCH request with vote=1 (upvote)
 * 2. Verify response contains: vote_score = 1, upvote_count = 1, downvote_count = 0
 *
 * **Test Execution - Phase 2: Change Upvote to Downvote**
 * 1. Second member sends PATCH request with vote=-1 (downvote)
 * 2. Verify response contains: vote_score = -1, upvote_count = 0, downvote_count = 1
 *
 * **Test Execution - Phase 3: Remove Vote Entirely**
 * 1. Second member sends PATCH request with vote=0 (remove vote)
 * 2. Verify response contains: vote_score = 0, upvote_count = 0, downvote_count = 0
 *
 * **Test Execution - Phase 4: Idempotency Check**
 * 1. Send vote=0 again
 * 2. Verify response remains the same (idempotent operation)
 */
export async function test_api_comment_vote_state_transitions(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Setup: Create author and voter
  // ========================================
  // Author connection and setup
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Voter connection and setup
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // ========================================
  // Setup: Author creates community
  // ========================================
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // ========================================
  // Setup: Author subscribes to their community
  // ========================================
  await api.functional.community.member.communities.subscribe(
    authorConnection,
    {
      communityName: community.name,
    },
  );
  // ========================================
  // Setup: Voter subscribes to the community
  // ========================================
  await api.functional.community.member.communities.subscribe(voterConnection, {
    communityName: community.name,
  });
  // ========================================
  // Setup: Author creates a post
  // ========================================
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // ========================================
  // Setup: Author creates a comment on the post
  // ========================================
  const comment = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(comment);
  // ========================================
  // Phase 1: Initial Upvote
  // ========================================
  const upvoteResult =
    await api.functional.community.member.comments.votes.vote(voterConnection, {
      commentId: comment.id,
      body: { vote: 1 } satisfies ICommunityCommentVote.IUpdate,
    });
  typia.assert(upvoteResult);
  TestValidator.equals(
    "initial upvote - vote_score",
    upvoteResult.vote_score,
    1,
  );
  TestValidator.equals(
    "initial upvote - upvote_count",
    upvoteResult.upvote_count,
    1,
  );
  TestValidator.equals(
    "initial upvote - downvote_count",
    upvoteResult.downvote_count,
    0,
  );
  // ========================================
  // Phase 2: Change Upvote to Downvote
  // ========================================
  const downvoteResult =
    await api.functional.community.member.comments.votes.vote(voterConnection, {
      commentId: comment.id,
      body: { vote: -1 } satisfies ICommunityCommentVote.IUpdate,
    });
  typia.assert(downvoteResult);
  // When changing from upvote to downvote, the score delta is -2
  // (lose +1 from upvote, gain -1 from downvote)
  TestValidator.equals(
    "change to downvote - vote_score",
    downvoteResult.vote_score,
    -1,
  );
  TestValidator.equals(
    "change to downvote - upvote_count",
    downvoteResult.upvote_count,
    0,
  );
  TestValidator.equals(
    "change to downvote - downvote_count",
    downvoteResult.downvote_count,
    1,
  );
  // ========================================
  // Phase 3: Remove Vote Entirely
  // ========================================
  const removeVoteResult =
    await api.functional.community.member.comments.votes.vote(voterConnection, {
      commentId: comment.id,
      body: { vote: 0 } satisfies ICommunityCommentVote.IUpdate,
    });
  typia.assert(removeVoteResult);
  // Removing the downvote restores score to 0
  TestValidator.equals(
    "remove vote - vote_score",
    removeVoteResult.vote_score,
    0,
  );
  TestValidator.equals(
    "remove vote - upvote_count",
    removeVoteResult.upvote_count,
    0,
  );
  TestValidator.equals(
    "remove vote - downvote_count",
    removeVoteResult.downvote_count,
    0,
  );
  // ========================================
  // Phase 4: Idempotency Check
  // ========================================
  const idempotentResult =
    await api.functional.community.member.comments.votes.vote(voterConnection, {
      commentId: comment.id,
      body: { vote: 0 } satisfies ICommunityCommentVote.IUpdate,
    });
  typia.assert(idempotentResult);
  // Sending vote=0 again should be idempotent
  TestValidator.equals(
    "idempotent remove - vote_score",
    idempotentResult.vote_score,
    0,
  );
  TestValidator.equals(
    "idempotent remove - upvote_count",
    idempotentResult.upvote_count,
    0,
  );
  TestValidator.equals(
    "idempotent remove - downvote_count",
    idempotentResult.downvote_count,
    0,
  );
}
