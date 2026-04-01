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

export async function test_api_post_image_retrieval_from_own_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create an image post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        image_path: typia.random<string>(),
      },
    },
  );
  typia.assert(post);
  // 5. Verify post has images
  TestValidator.predicate("post has images", post.images.length > 0);
  // 6. Retrieve image metadata using the first image's ID
  const firstImage = post.images[0];
  const imageMetadata =
    await api.functional.redditCommunity.member.posts.images.at(
      memberConnection,
      {
        postId: post.id,
        imageId: firstImage.id,
      },
    );
  typia.assert(imageMetadata);
  // 7. Validate image metadata fields
  TestValidator.equals("image id matches", imageMetadata.id, firstImage.id);
  TestValidator.predicate(
    "file_path exists",
    imageMetadata.file_path.length > 0,
  );
  TestValidator.predicate("file_size is positive", imageMetadata.file_size > 0);
  TestValidator.predicate(
    "mime_type is valid",
    imageMetadata.mime_type.startsWith("image/"),
  );
  TestValidator.predicate("width is positive", imageMetadata.width > 0);
  TestValidator.predicate("height is positive", imageMetadata.height > 0);
  TestValidator.predicate(
    "sort_order is non-negative",
    imageMetadata.sort_order >= 0,
  );
  TestValidator.equals(
    "post reference matches",
    imageMetadata.post.id,
    post.id,
  );
  TestValidator.predicate(
    "created_at is valid date",
    new Date(imageMetadata.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(imageMetadata.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active image",
    imageMetadata.deleted_at,
    null,
  );
}
