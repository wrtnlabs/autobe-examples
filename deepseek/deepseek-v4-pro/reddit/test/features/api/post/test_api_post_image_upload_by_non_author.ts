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
 * Test that a non-author member cannot upload an image to another member's post.
 *
 * Validates the authorization boundary for the post image upload endpoint. Member A creates
 * an image-type post as the content author, then Member B (a different, unrelated member)
 * attempts to upload an image to Member A's post. The test confirms that the server rejects
 * the request with HTTP 403 Forbidden, enforcing that only the original post author may
 * modify a post's attached image.
 *
 * 1. Member A registers via authorize_member_join and obtains an authenticated session.
 * 2. Member A creates a new community and subscribes to it to enable posting.
 * 3. Member A creates an image-type post within the subscribed community.
 * 4. Member B registers as a separate, unrelated member.
 * 5. Member B attempts to upload an image to Member A's post — expects HTTP 403.
 */
export async function test_api_post_image_upload_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers
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
      body: { type: "image" } satisfies DeepPartial<ICommunityHubPost.ICreate>,
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Member B registers
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B attempts to upload image to Member A's post (expect 403)
  await TestValidator.httpError(
    "non-author cannot upload image to another member's post",
    403,
    async () => {
      await api.functional.communityHub.posts._image.upload(memberBConnection, {
        postId: post.id,
        body: {
          file: "non-author-image-attempt",
        } satisfies ICommunityHubPostImage.IUpload,
      });
    },
  );
}
