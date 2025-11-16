import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Test successful creation of a new post in a user-created community.
 *
 * 1. Register a new user via join.
 * 2. As authenticated user, create a new community providing unique name,
 *    display_title, description, visibility, and status.
 * 3. Submit three new posts sequentially, one for each allowed type (text, link,
 *    image):\n - Provide required fields (type, title is unique within
 *    community, content fields according to type).\n - type: 'text': require
 *    body;\n - type: 'link': require link_url;\n - type: 'image': require
 *    image_url.\n - Status for a newly created post is 'published'.
 * 4. For each created post:\n - Assert it is visible for the designated community
 *    (i.e., returned post.community.id matches created community id).\n -
 *    Confirm post status is 'published'.
 * 5. Attempt to create another post of any type with a duplicate title in the same
 *    community and expect failure due to community-unique constraint.
 * 6. Validate all required authentication contexts and business/content
 *    constraints are met at each step.
 */
export async function test_api_post_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a new community
  const communityName = RandomGenerator.alphabets(10).toLowerCase();
  const communityDisplay = RandomGenerator.name();
  const communityDescription = RandomGenerator.content({ paragraphs: 2 });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string & tags.MinLength<3> & tags.MaxLength<30>,
        display_title: communityDisplay as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        description: communityDescription as string &
          tags.MinLength<1> &
          tags.MaxLength<2000>,
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create three posts of different types
  const postTypes = ["text", "link", "image"] as const;
  const postTitleData = postTypes.map((type) =>
    RandomGenerator.paragraph({ sentences: 5 }),
  ); // unique titles

  const [textPost, linkPost, imagePost] = await Promise.all([
    api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "text",
        title: postTitleData[0],
        body: RandomGenerator.content(),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    }),
    api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "link",
        title: postTitleData[1],
        link_url: "https://" + RandomGenerator.alphabets(8) + ".org",
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    }),
    api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "image",
        title: postTitleData[2],
        image_url: "https://" + RandomGenerator.alphabets(8) + ".com/image.jpg",
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    }),
  ]);

  [textPost, linkPost, imagePost].forEach((post, i) => {
    typia.assert(post);
    TestValidator.equals(
      `created post ${postTypes[i]} community id matches`,
      post.community.id,
      community.id,
    );
    TestValidator.equals(
      `created post ${postTypes[i]} status is published`,
      post.status,
      "published",
    );
    TestValidator.equals(
      `created post ${postTypes[i]} title matches input`,
      post.title,
      postTitleData[i],
    );
    TestValidator.equals(
      `created post ${postTypes[i]} type matches`,
      post.type,
      postTypes[i],
    );
  });

  // 4. Attempt to create new post with a duplicate title (should fail)
  await TestValidator.error(
    "post creation with duplicate title should fail",
    async () => {
      await api.functional.communityPlatform.user.posts.create(connection, {
        body: {
          type: "text",
          title: postTitleData[0], // duplicate of textPost
          body: RandomGenerator.content(),
          status: "published",
          community_id: community.id,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    },
  );
}
