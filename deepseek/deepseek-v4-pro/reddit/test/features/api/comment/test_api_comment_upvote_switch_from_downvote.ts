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
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test switching a comment vote from downvote to upvote preserves vote identity while updating direction and timestamps.
 *
 * Validates the vote-switch behavior where a member who previously downvoted a comment casts an upvote. Instead of creating a new vote record, the existing downvote is updated in place: the value flips from -1 to 1, the created_at timestamp remains at the original vote moment, and the updated_at timestamp advances to reflect the switch time. The vote's id, target_type, and target_id remain unchanged, confirming the operation modifies the existing record rather than deleting and recreating it.
 *
 * This vote switch triggers server-side cascading effects beyond the vote record itself: the comment's vote_score increases by two (reversing the -1 downvote penalty and applying the +1 upvote bonus), and the comment author's karma increases by two.
 *
 * 1. Comment author registers and creates a community, subscribes, posts, and writes a top-level comment.
 * 2. Voter registers as a separate member.
 * 3. Voter downvotes the comment, establishing a vote record with value -1.
 * 4. Voter upvotes the same comment, triggering the vote switch.
 * 5. Validates the upvote response: value is 1, id matches the downvote record, created_at is preserved, and updated_at reflects the switch.
 */
export async function test_api_comment_upvote_switch_from_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register comment author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe author to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      authorConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Create top-level comment
  const comment = await generate_random_community_hub_posts_comments_create(
    authorConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Register voter
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 7. Voter downvotes the comment
  const downvote = await api.functional.communityHub.member.comments.downvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(downvote);
  // 8. Voter upvotes the same comment (switch from downvote to upvote)
  const upvote = await api.functional.communityHub.member.comments.upvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(upvote);
  // 9. Validate vote switch behavior
  TestValidator.equals("downvote value is -1", downvote.value, -1);
  TestValidator.equals("upvote value is 1", upvote.value, 1);
  TestValidator.equals("same vote record ID preserved", upvote.id, downvote.id);
  TestValidator.equals("target type is comment", upvote.target_type, "comment");
  TestValidator.equals(
    "target ID matches comment",
    upvote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "created_at preserved after switch",
    upvote.created_at,
    downvote.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed after switch",
    upvote.updated_at,
    downvote.updated_at,
  );
  TestValidator.predicate(
    "updated_at after created_at",
    upvote.updated_at > upvote.created_at,
  );
}
