import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_create_image_post(
  connection: api.IConnection,
) {
  // Step 1: Create a user through authentication join
  const userJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user_" + RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });
  typia.assert(user);

  // Step 2: Create a community
  const communityData = {
    name:
      RandomGenerator.name(2)
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .substring(0, 30) || "community_" + RandomGenerator.alphaNumeric(5),
    slug:
      RandomGenerator.name(1)
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "") ||
      "slug" + RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    rules: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create an image post
  const imageData = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    type: "image" as const,
    image_uri: "https://example.com/image.jpg" satisfies string &
      tags.Format<"uri">,
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: imageData,
    });
  typia.assert(post);

  // Validate that the created post has the correct properties
  TestValidator.equals("post title matches", post.title, imageData.title);
  TestValidator.equals("post type is image", post.type, "image");
  TestValidator.equals(
    "post community id matches",
    post.community_forum_community_id,
    community.id,
  );
  TestValidator.equals(
    "post has image URI",
    post.image_uri,
    imageData.image_uri,
  );
  TestValidator.predicate("post has valid ID", () => post.id.length > 0);
  TestValidator.predicate(
    "post has user ID",
    () => post.community_forum_user_id.length > 0,
  );
  TestValidator.predicate(
    "post has session ID",
    () => post.community_forum_user_session_id.length > 0,
  );
  TestValidator.predicate(
    "post has creation timestamp",
    () => post.created_at.length > 0,
  );
  TestValidator.predicate(
    "post has update timestamp",
    () => post.updated_at.length > 0,
  );
}
