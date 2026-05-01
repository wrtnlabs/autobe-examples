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
 * Test idempotent behavior when a member upvotes a comment they have already upvoted.
 *
 * Validates that the upvote endpoint correctly handles the duplicate upvote case — when a member who already upvoted a comment attempts to upvote it again, the operation is idempotent. No state changes occur and the existing vote record is returned unchanged.
 *
 * The test sets up two separate members: one as the comment author who creates a community, subscribes, posts, and comments, and another as the voter who casts upvotes. The voter upvotes the same comment twice in succession.
 *
 * 1. Comment author registers, creates a community, subscribes to it, creates a text post, and writes a top-level comment.
 * 2. Voter registers as a separate member with no community subscription.
 * 3. Voter upvotes the comment — the first call establishes the upvote.
 * 4. Voter upvotes the same comment again — the second call must return the identical vote record.
 * 5. Validates idempotency: vote id, value, created_at, and updated_at are identical between both responses.
 * 6. Validates the vote correctly references the target comment with the expected target_type and target_id.
 */
export async function test_api_comment_upvote_idempotent_already_upvoted(
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
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Create top-level comment
  const comment = await generate_random_community_hub_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Register voter
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 7. First upvote on the comment
  const firstVote = await api.functional.communityHub.member.comments.upvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(firstVote);
  // 8. Second upvote on the same comment (idempotent)
  const secondVote = await api.functional.communityHub.member.comments.upvote(
    voterConnection,
    { commentId: comment.id },
  );
  typia.assert(secondVote);
  // 9. Validate idempotency — both responses must be identical
  TestValidator.equals("vote id unchanged", firstVote.id, secondVote.id);
  TestValidator.equals(
    "vote value unchanged",
    firstVote.value,
    secondVote.value,
  );
  TestValidator.equals(
    "vote created_at unchanged",
    firstVote.created_at,
    secondVote.created_at,
  );
  TestValidator.equals(
    "vote updated_at unchanged",
    firstVote.updated_at,
    secondVote.updated_at,
  );
  // 10. Validate vote content correctness
  TestValidator.equals("vote value is upvote", secondVote.value, 1);
  TestValidator.equals(
    "target is correct comment",
    secondVote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "target type is comment",
    secondVote.target_type,
    "comment",
  );
}
