import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
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
 * Test creating a top-level comment on a post within a subscribed community.
 *
 * Validates that an authenticated member can create a top-level comment on an
 * active post and that the response contains the full comment data with correct
 * metadata. A top-level comment starts a new discussion thread directly on the
 * post at depth zero with no parent comment reference.
 *
 * The test verifies core comment creation properties: the generated UUID
 * identifier, depth initialized to zero, vote score starting at zero, correct
 * author assignment matching the authenticated member, correct post reference,
 * null parent for top-level comments, and valid creation/update timestamps.
 *
 * Additionally confirms that the post's comment count increments from zero to
 * one after the comment is created, reflecting the denormalized counter update
 * that occurs atomically with comment insertion.
 *
 * 1. A new member registers and authenticates via join.
 * 2. The member creates a community, becoming its owner.
 * 3. The member subscribes to the community.
 * 4. The member creates a text post within the community.
 * 5. The member creates a top-level comment on the post.
 * 6. Validates comment structure: depth 0, vote_score 0, author match, post
 *    reference, null parent, and post comment_count increments from 0 to 1.
 */
export async function test_api_comment_create_top_level_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (member becomes owner)
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "initial post comment_count is 0",
    post.comment_count,
    0,
  );
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Validate comment properties
  TestValidator.equals("depth is 0 for top-level comment", comment.depth, 0);
  TestValidator.equals("vote_score initialized to 0", comment.vote_score, 0);
  TestValidator.equals(
    "author matches authenticated member",
    comment.author.id,
    member.id,
  );
  TestValidator.equals(
    "post reference matches target post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent is null for top-level comment",
    comment.parent,
    null,
  );
  TestValidator.equals(
    "post comment_count incremented to 1",
    comment.post.comment_count,
    1,
  );
}
