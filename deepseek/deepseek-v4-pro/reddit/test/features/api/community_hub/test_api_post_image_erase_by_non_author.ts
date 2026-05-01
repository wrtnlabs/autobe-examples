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
 * Test that a non-author member cannot erase the image from another member's image-type post.
 *
 * Validates the authorization rule that only the post author may remove an image attached to an image-type post. The test establishes a complete setup — community creation, subscription, image post creation, and image upload — all performed by Member A, then attempts the unauthorized erase from Member B, asserting the request is rejected with 403 Forbidden.
 *
 * The image's soft-deletion timestamp (`deleted_at`) is verified as null immediately after upload, confirming the image is in an active state before the forbidden attempt. Since the 403 rejection occurs at the authorization layer before any mutation, the image record remains fully intact.
 *
 * 1. Member A registers and authenticates via join.
 * 2. Member A creates a new community and subscribes to it.
 * 3. Member A creates an image-type post within the community.
 * 4. Member A uploads an image to the post and verifies `deleted_at` is null.
 * 5. Member B registers and authenticates as a separate member.
 * 6. Member B attempts to erase the image — expected 403 Forbidden.
 */
export async function test_api_post_image_erase_by_non_author(
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
  // 4. Member A creates an image-type post
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      body: { type: "image" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Member A uploads an image to the post
  const image = await api.functional.communityHub.posts._image.upload(
    memberAConnection,
    {
      postId: post.id,
      body: {
        file: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityHubPostImage.IUpload,
    },
  );
  typia.assert(image);
  TestValidator.equals(
    "image deleted_at is null after upload",
    image.deleted_at,
    null,
  );
  // 6. Member B registers and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 7. Member B attempts to erase the image — expect 403 Forbidden
  await TestValidator.httpError(
    "non-author cannot erase image",
    403,
    async () => {
      await api.functional.communityHub.posts._image.erase(memberBConnection, {
        postId: post.id,
      });
    },
  );
}
