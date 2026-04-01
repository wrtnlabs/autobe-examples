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
 * Test post update functionality across different post types (link and image posts).
 * Validates type-specific content fields are properly updated while post_type remains immutable.
 * Workflow:
 * 1. Member joins and authenticates
 * 2. Creates a community
 * 3. Subscribes to the community
 * 4. Creates a link post with initial URL
 * 5. Updates the link post with a different valid URL
 * 6. Creates an image post with initial image_path
 * 7. Updates the image post with a different image_path
 * 8. Validates post_type cannot be changed
 * 9. Validates updated_at reflects modification time
 * 10. Validates other post attributes remain intact
 */
export async function test_api_post_update_link_and_image_types(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await api.functional.redditCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create link post
  const initialLinkUrl = typia.random<string & tags.Format<"uri">>();
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "link",
        title: RandomGenerator.name(3),
        link_url: initialLinkUrl,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post type", linkPost.post_type, "link");
  TestValidator.equals("initial link_url", linkPost.link_url, initialLinkUrl);
  // 5. Update link post with new URL
  const newLinkUrl = typia.random<string & tags.Format<"uri">>();
  const updatedLinkPost =
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId: linkPost.id,
      body: {
        link_url: newLinkUrl,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(updatedLinkPost);
  TestValidator.equals(
    "updated link_url",
    updatedLinkPost.link_url,
    newLinkUrl,
  );
  TestValidator.equals(
    "link post type unchanged",
    updatedLinkPost.post_type,
    "link",
  );
  TestValidator.notEquals(
    "updated_at changed",
    linkPost.updated_at,
    updatedLinkPost.updated_at,
  );
  TestValidator.equals(
    "title preserved",
    updatedLinkPost.title,
    linkPost.title,
  );
  TestValidator.equals(
    "author preserved",
    updatedLinkPost.author.id,
    linkPost.author.id,
  );
  TestValidator.equals(
    "community preserved",
    updatedLinkPost.community.id,
    linkPost.community.id,
  );
  // 6. Create image post
  const initialImagePath = RandomGenerator.alphabets(20);
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: RandomGenerator.name(3),
        image_path: initialImagePath,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  TestValidator.equals("image post type", imagePost.post_type, "image");
  TestValidator.equals(
    "initial image_path",
    imagePost.image_path,
    initialImagePath,
  );
  // 7. Update image post with new image_path
  const newImagePath = RandomGenerator.alphabets(25);
  const updatedImagePost =
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId: imagePost.id,
      body: {
        image_path: newImagePath,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(updatedImagePost);
  TestValidator.equals(
    "updated image_path",
    updatedImagePost.image_path,
    newImagePath,
  );
  TestValidator.equals(
    "image post type unchanged",
    updatedImagePost.post_type,
    "image",
  );
  TestValidator.notEquals(
    "updated_at changed",
    imagePost.updated_at,
    updatedImagePost.updated_at,
  );
  TestValidator.equals(
    "title preserved",
    updatedImagePost.title,
    imagePost.title,
  );
  TestValidator.equals(
    "author preserved",
    updatedImagePost.author.id,
    imagePost.author.id,
  );
  TestValidator.equals(
    "community preserved",
    updatedImagePost.community.id,
    imagePost.community.id,
  );
}
