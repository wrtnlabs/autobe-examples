import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_images_create } from "../../../generate/generate_random_reddit_community_member_posts_images_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_image } from "../../../prepare/prepare_random_reddit_community_post_image";

/**
 * Test authorization failure when a member attempts to update image metadata on a post they do not own.
 *
 * Workflow:
 * 1. Member A registers and creates a community
 * 2. Member A subscribes to their own community
 * 3. Member A creates an image post in the community
 * 4. Member A attaches an image to the post
 * 5. Member B registers (separate account)
 * 6. Member B attempts to update the image metadata on Member A's post
 * 7. Verify the system rejects with 403 Forbidden (ownership-based access control)
 */
export async function test_api_post_image_update_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (post author) setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Member A creates community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Member A subscribes to their own community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates an image post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        image_path: RandomGenerator.alphabets(20),
      },
    },
  );
  typia.assert(post);
  // 5. Member A attaches an image to the post
  const image =
    await generate_random_reddit_community_member_posts_images_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          filePath: typia.random<string & tags.Format<"uri">>(),
          fileSize: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          mimeType: "image/jpeg",
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(image);
  // 6. Member B (non-author) setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 7. Member B attempts to update image metadata on Member A's post - should fail with 403
  await TestValidator.error("non-author image update forbidden", async () => {
    await api.functional.redditCommunity.member.posts.images.putByPostidAndImageid(
      memberBConnection,
      {
        postId: post.id,
        imageId: image.id,
        body: {
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  });
}
