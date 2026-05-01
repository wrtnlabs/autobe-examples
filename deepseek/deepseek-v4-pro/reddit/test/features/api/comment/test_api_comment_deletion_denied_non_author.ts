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
 * Test that a non-author, non-moderator member cannot delete another member's comment.
 *
 * Validates the authorization boundary around comment deletion: only the comment's original author and community moderators are permitted to delete a comment. A regular member who is neither the author nor a moderator must be rejected when attempting to delete someone else's comment.
 *
 * The test establishes Member A as the community owner and comment author, then authenticates Member B — a separate member with no moderator privileges — and verifies that Member B's attempt to delete Member A's comment is rejected with 403 Forbidden.
 *
 * 1. Member A registers via authorize_member_join.
 * 2. Member A creates a community using generate_random_community_hub_member_communities_create.
 * 3. Member A subscribes to the community.
 * 4. Member A creates a text post in the community.
 * 5. Member A writes a top-level comment on the post.
 * 6. Member B registers separately via authorize_member_join.
 * 7. Member B attempts to delete Member A's comment — expects 403 Forbidden.
 */
export async function test_api_comment_deletion_denied_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Member A creates a post
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  typia.assert(post);
  // 5. Member A writes a top-level comment
  const comment = await generate_random_community_hub_posts_comments_create(
    memberAConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Member B registers separately — no moderator role in Member A's community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 7. Member B attempts to delete Member A's comment — expect 403 Forbidden
  await TestValidator.httpError(
    "non-author non-moderator cannot delete another member's comment",
    403,
    async () => {
      await api.functional.communityHub.comments.erase(memberBConnection, {
        commentId: comment.id,
      });
    },
  );
}
