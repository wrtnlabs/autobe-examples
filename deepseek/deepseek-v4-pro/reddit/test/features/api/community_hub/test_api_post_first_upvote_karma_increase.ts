import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_votes_create } from "../../../generate/generate_random_community_hub_member_votes_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_vote } from "../../../prepare/prepare_random_community_hub_vote";

/**
 * Test that a first-time upvote on a post correctly updates the post's vote score,
 * the post author's karma, and leaves the voter's karma unchanged.
 *
 * Validates the complete karma and vote score cascade when a member upvotes another
 * member's post for the first time. The post's vote_score must increase from 0 to 1,
 * the post author's karma must increase from 0 to 1, and the voting member's own
 * karma must remain at 0.
 *
 * Special attention is given to verifying the vote record's timestamps — for a
 * first-time vote, created_at and updated_at must be equal — and that the vote's
 * member field references the voting member, not the post author.
 *
 * 1. Member A joins, creates a community, subscribes, and publishes a text post.
 * 2. Member B joins and casts an upvote on Member A's post.
 * 3. Validates vote response structure, post vote_score, Member A's karma, and Member B's karma.
 */
export async function test_api_post_first_upvote_karma_increase(
  connection: api.IConnection,
): Promise<void> {
  // ---- Member A: Setup (author) ----
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAUsername = RandomGenerator.name(1);
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      username: memberAUsername,
    },
  });
  typia.assert(memberA);
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(community);
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  typia.assert(post);
  // ---- Member B: Setup (voter) ----
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBUsername = RandomGenerator.name(1);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      username: memberBUsername,
    },
  });
  typia.assert(memberB);
  // ---- Member B votes on Member A's post ----
  const vote = await generate_random_community_hub_member_votes_create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(vote);
  // ---- Validate vote response ----
  TestValidator.equals("vote value is 1 (upvote)", vote.value, 1);
  TestValidator.equals("vote target_type is post", vote.target_type, "post");
  TestValidator.equals("vote target_id matches post", vote.target_id, post.id);
  TestValidator.equals(
    "first-time vote: created_at equals updated_at",
    vote.created_at,
    vote.updated_at,
  );
  TestValidator.equals(
    "vote member is Member B (not post author)",
    vote.member.id,
    memberB.id,
  );
  // ---- Re-authenticate Member A to verify karma increase ----
  const memberAReauthConnection: api.IConnection = { host: connection.host };
  const memberAUpdated = await authorize_member_login(memberAReauthConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: connection.host,
      referrer: connection.host,
    },
  });
  typia.assert(memberAUpdated);
  TestValidator.equals(
    "Member A karma increased to 1 after receiving upvote",
    memberAUpdated.karma,
    1,
  );
  const updatedPost = memberAUpdated.posts.find((p) => p.id === post.id);
  typia.assert(updatedPost!);
  TestValidator.equals(
    "post vote_score is 1 after upvote",
    updatedPost!.vote_score,
    1,
  );
  // ---- Re-authenticate Member B to verify karma unchanged ----
  const memberBReauthConnection: api.IConnection = { host: connection.host };
  const memberBUpdated = await authorize_member_login(memberBReauthConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: connection.host,
      referrer: connection.host,
    },
  });
  typia.assert(memberBUpdated);
  TestValidator.equals(
    "Member B karma remains 0 (voting does not affect voter karma)",
    memberBUpdated.karma,
    0,
  );
}
