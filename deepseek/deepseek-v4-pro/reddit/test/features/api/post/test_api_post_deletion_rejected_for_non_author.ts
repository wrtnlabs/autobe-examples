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
 * Test that deletion of a post by a non-author, non-moderator member is
 * rejected with HTTP 403 Forbidden.
 *
 * Validates the authorization rule that only the post author or a community
 * moderator may delete a post. A second member — who is neither the post
 * author nor a community moderator — authenticates and attempts to delete
 * the post, receiving a 403 Forbidden response that confirms the access
 * control is enforced correctly.
 *
 * The test also verifies at creation time that the post's deleted_at
 * timestamp is null, establishing the baseline that the post is active
 * before the unauthorized deletion attempt.
 *
 * 1. Member A registers and authenticates via authorize_member_join.
 * 2. Member A creates a community and becomes its permanent owner.
 * 3. Member A subscribes to the community, a prerequisite for posting.
 * 4. Member A creates a text post within the subscribed community.
 * 5. Member B registers and authenticates as a separate member.
 * 6. Member B attempts to delete Member A's post and receives 403.
 */
export async function test_api_post_deletion_rejected_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Member A (the post author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 2. Create a community owned by Member A
  const community =
    await generate_random_community_hub_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe Member A to the community
  await api.functional.communityHub.member.communities.subscriptions.create(
    authorConnection,
    { communityName: community.name },
  );
  // 4. Create a text post authored by Member A
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  TestValidator.equals("post is active on creation", post.deleted_at, null);
  // 5. Register and authenticate as Member B (neither author nor moderator)
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherConnection, {});
  // 6. Member B attempts to delete Member A's post — expect 403 Forbidden
  await TestValidator.httpError(
    "non-author cannot delete another member's post",
    403,
    async () => {
      await api.functional.communityHub.posts.erase(otherConnection, {
        postId: post.id,
      });
    },
  );
}
