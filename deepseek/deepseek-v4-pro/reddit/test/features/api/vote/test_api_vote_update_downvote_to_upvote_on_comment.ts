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
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_vote } from "../../../prepare/prepare_random_community_hub_vote";

/**
 * Test switching a vote from downvote to upvote on a comment.
 *
 * Validates the complete vote-update workflow where a member changes their
 * stance on a comment from downvote to upvote. The test uses two separate
 * members — a comment author who owns the content, and a voting member who
 * casts and modifies the vote — to ensure karma adjustments are applied to
 * the content author, not the voter.
 *
 * 1. Comment author registers, creates a community, subscribes, creates a
 *    text post, and creates a top-level comment on the post.
 * 2. Voting member registers separately.
 * 3. Voting member casts an initial downvote (-1) on the comment.
 * 4. Voting member switches the vote to upvote (+1) via PUT /votes/{voteId}.
 * 5. Comment author re-authenticates to retrieve the updated karma score.
 * 6. Validates that the vote value changed to 1, created_at is preserved,
 *    updated_at is newer than the original, and the comment author's karma
 *    reflects the net change from the vote switch.
 */
export async function test_api_vote_update_downvote_to_upvote_on_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Comment author registers
  const authorConnection: api.IConnection = { host: connection.host };
  const authorCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  };
  const authorMember = await authorize_member_join(authorConnection, {
    body: authorCreds,
  });
  typia.assert(authorMember);
  // 2. Comment author creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      authorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Comment author subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      authorConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Comment author creates a text post
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Comment author creates a top-level comment
  const comment = await generate_random_community_hub_posts_comments_create(
    authorConnection,
    {
      body: {},
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Voting member registers
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, { body: {} });
  // 7. Voting member casts initial downvote on the comment
  const initialVote = await generate_random_community_hub_member_votes_create(
    voterConnection,
    {
      body: {
        target_type: "comment",
        target_id: comment.id,
        value: -1,
      },
    },
  );
  typia.assert(initialVote);
  // 8. Voting member switches vote from downvote to upvote
  const updatedVote = await api.functional.communityHub.member.votes.update(
    voterConnection,
    {
      voteId: initialVote.id,
      body: { value: 1 } satisfies ICommunityHubVote.IUpdate,
    },
  );
  typia.assert(updatedVote);
  // 9. Re-authenticate comment author to retrieve updated karma
  const refreshedAuthorConnection: api.IConnection = { host: connection.host };
  const updatedAuthorMember = await authorize_member_login(
    refreshedAuthorConnection,
    {
      body: {
        email: authorCreds.email,
        password: authorCreds.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(updatedAuthorMember);
  // 10. Assertions
  TestValidator.equals("vote value switched to upvote", updatedVote.value, 1);
  TestValidator.equals(
    "created_at preserved unchanged",
    updatedVote.created_at,
    initialVote.created_at,
  );
  TestValidator.predicate(
    "updated_at is newer than original",
    updatedVote.updated_at > initialVote.updated_at,
  );
  TestValidator.equals(
    "member unchanged",
    updatedVote.member.id,
    initialVote.member.id,
  );
  TestValidator.equals(
    "target_type unchanged",
    updatedVote.target_type,
    initialVote.target_type,
  );
  TestValidator.equals(
    "target_id unchanged",
    updatedVote.target_id,
    initialVote.target_id,
  );
  TestValidator.equals(
    "comment author karma net increase by 1",
    updatedAuthorMember.karma,
    (authorMember.karma + 1) satisfies number as number,
  );
}
