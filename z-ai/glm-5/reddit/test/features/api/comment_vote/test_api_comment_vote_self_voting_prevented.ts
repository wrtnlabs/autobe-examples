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
 * Test that users cannot vote on their own comments (self-voting prevention).
 *
 * This test verifies the business rule that prevents members from upvoting
 * or downvoting their own comments, which ensures fair karma distribution
 * and prevents self-promotion abuse.
 *
 * **Setup:**
 * 1. Member joins the platform
 * 2. Member creates a community (becomes owner)
 * 3. Member subscribes to their community
 * 4. Member creates a post in the community
 * 5. Member creates a comment on their own post
 *
 * **Test Execution:**
 * 1. Member attempts to upvote their own comment
 * 2. Verify the operation fails with 403 FORBIDDEN
 * 3. Verify comment vote metrics remain at initial state (score=0)
 */
export async function test_api_comment_vote_self_voting_prevented(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Member creates a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Member subscribes to their community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Member creates a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Member creates a comment on their own post
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // Verify initial comment state - no votes yet
  TestValidator.equals("initial vote score", comment.voteScore, 0);
  TestValidator.equals("initial upvote count", comment.upvoteCount, 0);
  TestValidator.equals("initial downvote count", comment.downvoteCount, 0);
  // 6. Member attempts to upvote their own comment - should fail
  await TestValidator.httpError(
    "self-voting should be prevented",
    403,
    async () =>
      await api.functional.community.member.comments.votes.vote(
        memberConnection,
        {
          commentId: comment.id,
          body: { vote: 1 } satisfies ICommunityCommentVote.IUpdate,
        },
      ),
  );
  // 7. Also test that downvoting own comment is prevented
  await TestValidator.httpError(
    "self-downvoting should also be prevented",
    403,
    async () =>
      await api.functional.community.member.comments.votes.vote(
        memberConnection,
        {
          commentId: comment.id,
          body: { vote: -1 } satisfies ICommunityCommentVote.IUpdate,
        },
      ),
  );
}
