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
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Verify that an unauthenticated guest can retrieve a single post by its ID and receive the complete post detail view.
 *
 * Sets up the full prerequisite chain: a member registers and authenticates, creates a community, subscribes to that community, and publishes a text post within it. Then an unauthenticated guest connection — with no Authorization header — fetches the post through the public post detail endpoint.
 *
 * Validates that the response includes all required metadata fields: the post id, type, title, and body content match the original creation values; vote_score and comment_count are initialized to zero for a fresh post; the author's username and community name are correctly associated; created_at and updated_at timestamps are equal (no edits yet); and deleted_at is null confirming the post is active. The typia.assert call ensures the complete ICommunityHubPost structure is valid including all nested author and community summary fields with their UUIDs, karma scores, and timestamps.
 */
export async function test_api_post_detail_view_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const createdPost =
    await generate_random_community_hub_communities_posts_create(
      memberConnection,
      {
        body: { type: "text" },
        params: { communityName: community.name },
      },
    );
  typia.assert(createdPost);
  // 5. Guest retrieves the post with no authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.communityHub.posts.at(
    guestConnection,
    { postId: createdPost.id },
  );
  typia.assert(retrievedPost);
  // 6. Validate post identity and content
  TestValidator.equals("post id matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("post type matches", retrievedPost.type, "text");
  TestValidator.equals(
    "post title matches",
    retrievedPost.title,
    createdPost.title,
  );
  TestValidator.equals(
    "post body matches",
    retrievedPost.body,
    createdPost.body,
  );
  TestValidator.predicate(
    "post body is non-null for text type",
    retrievedPost.body !== null,
  );
  // 7. Validate engagement metrics initialized to zero
  TestValidator.equals(
    "vote_score initialized to zero",
    retrievedPost.vote_score,
    0,
  );
  TestValidator.equals(
    "comment_count initialized to zero",
    retrievedPost.comment_count,
    0,
  );
  // 8. Validate author and community associations
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    member.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedPost.author.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  // 9. Validate timestamps and active status
  TestValidator.equals(
    "created_at matches updated_at for unedited post",
    retrievedPost.created_at,
    retrievedPost.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null for active post",
    retrievedPost.deleted_at === null,
  );
}
