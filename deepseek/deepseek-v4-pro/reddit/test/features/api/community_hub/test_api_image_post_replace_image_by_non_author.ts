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
 * Test that a non-author member cannot replace the image on another member's image-type post.
 *
 * Validates the core ownership-based authorization rule: only the post author can modify a post's image. Member A creates an image-type post and uploads an image, establishing clear ownership. Member B, a different authenticated member, then attempts to replace the image via the PUT endpoint.
 *
 * The request must be rejected with a 403 Forbidden response because the specification requires the authenticated user's community_hub_member_id to match the post's author. The image is an integral part of the post, and modifying it requires post authorship.
 *
 * 1. Member A registers and authenticates — establishing a session with JWT token.
 * 2. Member A creates a community to host the image post.
 * 3. Member A subscribes to the newly created community.
 * 4. Member A creates an image-type post with an initial image file.
 * 5. Member A uploads the initial image, establishing the image record.
 * 6. Member B registers and authenticates as a separate member.
 * 7. Member B attempts to replace the image on Member A's post — rejected with 403.
 */
export async function test_api_image_post_replace_image_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
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
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates an image-type post
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      body: {
        type: "image",
        image: {
          file: typia.random<string>(),
        } satisfies ICommunityHubPostImage.IUpload,
      },
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // 5. Member A uploads the initial image
  const imageUploadBody = {
    file: typia.random<string>(),
  } satisfies ICommunityHubPostImage.IUpload;
  const uploadedImage = await api.functional.communityHub.posts._image.upload(
    memberAConnection,
    {
      postId: post.id,
      body: imageUploadBody,
    },
  );
  typia.assert(uploadedImage);
  // 6. Member B registers and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 7. Member B attempts to replace the image — expect 403
  const updateBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityHubPostImage.IUpdate;
  await TestValidator.httpError(
    "non-author cannot replace image",
    403,
    async () => {
      await api.functional.communityHub.posts._image.update(memberBConnection, {
        postId: post.id,
        body: updateBody,
      });
    },
  );
}
