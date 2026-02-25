import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_vote } from "../../../generate/generate_random_community_member_comments_vote";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test the self-voting prevention business rule.
 *
 * A member creates a comment and then attempts to vote on their own comment,
 * which should be forbidden with a 403 Forbidden response.
 *
 * **Test Steps:**
 * 1. Member A authenticates via join endpoint
 * 2. Member A creates a community (becomes owner)
 * 3. Member A creates a text post in the community
 * 4. Member A creates a comment on their own post
 * 5. Member A attempts to upvote their own comment (vote=1)
 *
 * **Validations:**
 * - Response status should be 403 Forbidden
 * - The comment's vote_score should remain 0
 * - The comment's upvote_count should remain 0
 */
export async function test_api_comment_vote_self_voting_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member A
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community (creator is auto-subscribed)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Create a text post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Step 4: Create a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(comment);
  // Verify initial comment state (new comments start with 0 votes)
  TestValidator.equals("initial vote_score", comment.voteScore, 0);
  TestValidator.equals("initial upvote_count", comment.upvoteCount, 0);
  TestValidator.equals("initial downvote_count", comment.downvoteCount, 0);
  // Step 5: Attempt to upvote own comment - should fail with 403 Forbidden
  await TestValidator.httpError("self-voting prevention", 403, async () => {
    await api.functional.community.member.comments.vote(memberConnection, {
      commentId: comment.id,
      body: { vote: 1 } satisfies ICommunityCommentVote.ICreate,
    });
  });
}
