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
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a member can retrieve image metadata from another member's public image post.
 *
 * This test verifies the following workflow:
 * 1. Member A (post creator) joins and creates a community
 * 2. Member A subscribes to the community
 * 3. Member A creates an image post with attached images
 * 4. Member B (different user) joins and retrieves image metadata from Member A's post
 * 5. Validates that all authenticated members can access public post images
 */
export async function test_api_post_image_retrieval_from_other_member_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A (post creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Create a community as Member A
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community as Member A
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create an image post as Member A
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        image_path: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Validate post has images
  TestValidator.predicate("post has images", post.images.length > 0);
  const image = post.images[0];
  // 5. Authenticate as Member B (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 6. Retrieve image metadata from Member A's post as Member B
  const imageMetadata =
    await api.functional.redditCommunity.member.posts.images.at(
      memberBConnection,
      {
        postId: post.id,
        imageId: image.id,
      },
    );
  typia.assert(imageMetadata);
  // Validate image metadata
  TestValidator.equals("image ID matches", imageMetadata.id, image.id);
  TestValidator.equals(
    "post author matches Member A",
    imageMetadata.post.author.id,
    memberAAuth.id,
  );
  TestValidator.predicate(
    "file path exists",
    imageMetadata.file_path.length > 0,
  );
  TestValidator.predicate("file size is positive", imageMetadata.file_size > 0);
  TestValidator.predicate(
    "mime type is valid",
    imageMetadata.mime_type.startsWith("image/"),
  );
  TestValidator.predicate("width is positive", imageMetadata.width > 0);
  TestValidator.predicate("height is positive", imageMetadata.height > 0);
  TestValidator.predicate(
    "sort order is non-negative",
    imageMetadata.sort_order >= 0,
  );
}
