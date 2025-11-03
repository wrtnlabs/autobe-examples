import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an authenticated user can create a text post in a community.
 *
 * 1. Register and authenticate a user.
 * 2. User creates a new community.
 * 3. User creates a text post in that community with only text type (no link or
 *    image fields), setting post title and content.
 * 4. Validate that post response contains text_content (not link/image fields),
 *    author is the registered user, and community is the newly created one.
 *    Assert all post metadata matches input and expected ownership.
 */
export async function test_api_post_creation_text_type_user_in_community(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const joinOutput = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "passw0rd!test",
      display_name: displayName,
      href: "https://test.community/join",
      referrer: "https://test.community/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Create a new community
  const communityName = RandomGenerator.alphabets(10).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 12,
  });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a new text post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 10,
  });
  const textBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 16,
    wordMin: 5,
    wordMax: 12,
  });
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        text_body: textBody,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Validation
  // (a) Author matches registered user
  TestValidator.equals("author id is user", post.author.id, joinOutput.id);
  TestValidator.equals(
    "author display name is user display name",
    post.author.display_name,
    joinOutput.display_name,
  );
  // (b) Community matches
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals(
    "community name matches",
    post.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    post.community.description,
    community.description,
  );
  // (c) Title and text_content
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.predicate(
    "post has text_content and correct body",
    post.text_content !== null && post.text_content?.body === textBody,
  );
  // (d) Image and link fields are empty/null
  TestValidator.equals("post link_content is null", post.link_content, null);
  TestValidator.equals(
    "image_contents empty for text post",
    post.image_contents.length,
    0,
  );
}
