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
 * Validate that a user can update a text post's title and content, enforcing
 * content type invariance and edit auditing.
 *
 * Business context:
 *
 * - Only the authenticated owner of a post can update the post.
 * - Title and main content (text_body) can be changed for a text-type post;
 *   content type cannot be changed (e.g., text cannot become link or image
 *   post).
 * - Updates must be reflected in the returned post object, and prior content
 *   should be audited via edit history (if exposed).
 * - Invalid operations such as supplying link or image data for a text post must
 *   be rejected.
 *
 * Test Steps:
 *
 * 1. Register and join as a new user (acquire authorization in connection).
 * 2. Create a new community.
 * 3. Create a text-type post in the new community (title + text_body only).
 * 4. Update the post's title and text_body using the update API (supply only
 *    allowed fields).
 * 5. Validate: The returned post has updated title and text_body, type is still
 *    text, author is unchanged, and audit trail (if available) records the
 *    edit.
 * 6. Attempt to update content type by supplying link or image data; ensure API
 *    rejects these requests (business rule enforcement).
 */
export async function test_api_post_update_title_content_user(
  connection: api.IConnection,
) {
  // 1. User registration
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userJoinInput,
  });
  typia.assert(userAuth);

  // 2. Create a new community
  const communityInput = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })
      .replace(/\s/g, "_")
      .toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);

  // 3. Create a text-type post in this community
  const textBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const postCreateInput = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    text_body: textBody,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postCreateInput },
  );
  typia.assert(post);
  // Confirm text_content is present
  typia.assert<ICommunityPlatformPostTexts.ISummary>(post.text_content!);
  TestValidator.equals(
    "author is the joined user",
    post.author.id,
    userAuth.id,
  );
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals("text body set", post.text_content?.body, textBody);

  // 4. Update the post's title and text_body
  const newTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 14,
  });
  const newTextBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const postUpdateInput = {
    title: newTitle,
    body: newTextBody,
  } satisfies ICommunityPlatformPost.IUpdate;
  const updated = await api.functional.communityPlatform.user.posts.update(
    connection,
    { postId: post.id, body: postUpdateInput },
  );
  typia.assert(updated);
  TestValidator.equals("updated post id same", updated.id, post.id);
  TestValidator.equals("updated post title", updated.title, newTitle);
  TestValidator.equals(
    "updated text body",
    updated.text_content?.body,
    newTextBody,
  );
  TestValidator.equals(
    "content type is still text",
    updated.link_content,
    null,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(post.updated_at).getTime(),
  );
  TestValidator.equals("author unchanged", updated.author.id, post.author.id);
  TestValidator.equals(
    "community unchanged",
    updated.community.id,
    post.community.id,
  );

  // 5. Negative test: Attempt to change content type by updating with url (link post data)
  await TestValidator.error(
    "cannot update text post by supplying url (attempt type change)",
    async () => {
      await api.functional.communityPlatform.user.posts.update(connection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          url: "https://external-site.example/link",
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 6. Negative test: Attempt to change content type by updating with image data (image post data)
  await TestValidator.error(
    "cannot update text post by supplying images (attempt type change)",
    async () => {
      await api.functional.communityPlatform.user.posts.update(connection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          images: [
            {
              uri: "https://cdn.img.com/example.jpg",
              file_type: "jpeg",
              file_size_bytes: 150000,
            },
          ],
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );
}
