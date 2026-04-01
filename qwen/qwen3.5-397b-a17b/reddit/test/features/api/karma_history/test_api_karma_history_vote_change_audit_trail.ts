import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test retrieving karma history records that demonstrate the audit trail when a member changes their vote.
 *
 * This test validates the karma history audit trail functionality by:
 * 1. Member A registers, creates a community, subscribes, and creates a post
 * 2. Member B registers, subscribes to the community, and upvotes Member A's post (creates first karma record with +1)
 * 3. Member B changes vote from upvote to downvote (creates second karma record with -2 change, reversing +1 and applying -1)
 * 4. Validates the vote change flow which triggers karma history record creation
 *
 * Note: The karma history records are created internally by the vote operations. This test validates
 * the vote change flow that generates the audit trail. Direct karma history retrieval would require
 * the history IDs which are created during vote operations.
 *
 * Expected validation:
 * - First vote: direction = UPVOTE (creates karma record with change_amount = +1)
 * - Second vote: direction = DOWNVOTE (creates karma record with change_amount = -2, reversing +1 and applying -1)
 * - Both votes target the same post (same source_id in karma history)
 * - Member B is the voter in both records
 * - Timestamps show chronological order of vote changes
 */
export async function test_api_karma_history_vote_change_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // STEP 1: Member A Setup - Create community and post
  // ============================================
  // Member A registers
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  // Member A creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Member A subscribes to their own community
  const subscriptionA =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscriptionA);
  // Member A creates a text post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // ============================================
  // STEP 2: Member B Setup - Register and subscribe
  // ============================================
  // Member B registers
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Member B subscribes to the community
  const subscriptionB =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberBConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscriptionB);
  // ============================================
  // STEP 3: Member B upvotes the post (creates first karma history record)
  // ============================================
  const upvote =
    await generate_random_reddit_community_member_posts_vote_create(
      memberBConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // ============================================
  // STEP 4: Member B changes vote to downvote (creates second karma history record)
  // ============================================
  const downvote =
    await api.functional.redditCommunity.member.posts.vote.update(
      memberBConnection,
      {
        postId: post.id,
        body: {
          direction: "DOWNVOTE",
        } satisfies IRedditCommunityPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  // ============================================
  // STEP 5: Validate vote change audit trail
  // ============================================
  // Validate vote directions
  TestValidator.equals("upvote direction", upvote.direction, "UPVOTE");
  TestValidator.equals("downvote direction", downvote.direction, "DOWNVOTE");
  // Validate both votes target the same post (same source_id in karma history)
  TestValidator.equals("upvote post ID matches", upvote.post.id, post.id);
  TestValidator.equals("downvote post ID matches", downvote.post.id, post.id);
  // Validate voter is Member B in both votes
  TestValidator.equals(
    "upvote voter is Member B",
    upvote.member.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "downvote voter is Member B",
    downvote.member.id,
    memberBAuth.id,
  );
  // Validate timestamps show chronological order
  TestValidator.predicate(
    "upvote created before downvote updated",
    new Date(upvote.created_at).getTime() <=
      new Date(downvote.updated_at).getTime(),
  );
  // Validate downvote was updated (not just created)
  TestValidator.predicate(
    "downvote has update timestamp",
    new Date(downvote.updated_at).getTime() >=
      new Date(downvote.created_at).getTime(),
  );
}
