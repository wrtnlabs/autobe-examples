import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test creation of text, link, image, and mixed content posts by an
 * authenticated member.
 *
 * 1. Register a new member (required for posting).
 * 2. Create a community as the new member.
 * 3. Upload an image file by the member (to use for image/mixed posts).
 * 4. Successfully create: a. a text post in the created community b. an image post
 *    (references uploaded image) c. a link post (content_body is a URL) d. a
 *    post with both text body and image upload (if schema allows)
 * 5. For each created post:
 *
 *    - Assert it is linked to the member and community.
 *    - Title is as provided (all unique, as required).
 *    - Content_body present when expected (text or link posts).
 *    - Content_type matches ('text', 'link', 'image').
 *    - Status populated (published, queued, etc.).
 * 6. Attempt to create post with duplicate title in the same community and assert
 *    error.
 * 7. Attempt post creation without authentication (simulate by clearing token) and
 *    expect failure.
 * 8. If moderation/ban is enforced, simulate ban and assert banned users are
 *    blocked from posting.
 */
export async function test_api_post_creation_member_text_image_link_mixed(
  connection: api.IConnection,
) {
  // Member registration
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: joinInput,
  });
  typia.assert(member);

  // Create community as member
  const communityInput = {
    name:
      RandomGenerator.name(2).replace(/ /g, "_") +
      RandomGenerator.alphaNumeric(4),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    slug:
      RandomGenerator.name(2).replace(/ /g, "-") +
      RandomGenerator.alphaNumeric(3),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityInput },
    );
  typia.assert(community);

  // Upload image file as member (files typically need a backend URL, using realistic values)
  const fileUploadInput = {
    uploaded_by_member_id: member.id,
    original_filename: RandomGenerator.name(1) + ".png",
    storage_key: RandomGenerator.alphaNumeric(32),
    mime_type: "image/png",
    file_size_bytes: typia.random<number & tags.Type<"int32">>(),
    url:
      "https://files.example.com/" + RandomGenerator.alphaNumeric(24) + ".png",
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const file = await api.functional.communityPlatform.member.fileUploads.create(
    connection,
    { body: fileUploadInput },
  );
  typia.assert(file);

  // Helper: Unique title per post
  const uniqueTitle = (prefix: string) =>
    `${prefix}-${RandomGenerator.alphaNumeric(6)}`;

  // a. Text post
  const textPostInput = {
    community_platform_community_id: community.id,
    title: uniqueTitle("TextPost"),
    content_body: RandomGenerator.content({ paragraphs: 1 }),
    content_type: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const textPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: textPostInput },
  );
  typia.assert(textPost);
  TestValidator.equals(
    "text post linked to member",
    textPost.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "text post linked to community",
    textPost.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("text post content_type", textPost.content_type, "text");
  TestValidator.equals("text post title", textPost.title, textPostInput.title);
  TestValidator.predicate(
    "text post content_body present",
    !!textPost.content_body,
  );

  // b. Image post
  const imagePostInput = {
    community_platform_community_id: community.id,
    title: uniqueTitle("ImagePost"),
    content_type: "image",
    // Assumption: actual attachment of image happens at another endpoint; here we ensure type and valid link
  } satisfies ICommunityPlatformPost.ICreate;
  const imagePost = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: imagePostInput },
  );
  typia.assert(imagePost);
  TestValidator.equals(
    "image post linked to member",
    imagePost.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "image post linked to community",
    imagePost.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "image post content_type",
    imagePost.content_type,
    "image",
  );
  TestValidator.equals(
    "image post title",
    imagePost.title,
    imagePostInput.title,
  );

  // c. Link post
  const linkUrl = "https://" + RandomGenerator.alphaNumeric(12) + ".com";
  const linkPostInput = {
    community_platform_community_id: community.id,
    title: uniqueTitle("LinkPost"),
    content_body: linkUrl,
    content_type: "link",
  } satisfies ICommunityPlatformPost.ICreate;
  const linkPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: linkPostInput },
  );
  typia.assert(linkPost);
  TestValidator.equals(
    "link post linked to member",
    linkPost.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "link post linked to community",
    linkPost.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("link post content_type", linkPost.content_type, "link");
  TestValidator.equals("link post title", linkPost.title, linkPostInput.title);
  TestValidator.equals(
    "link post content_body equals url",
    linkPost.content_body,
    linkUrl,
  );

  // d. Another image post with content_body as text (if business logic allows, else just as image)
  // Here, only allowed fields used as per ICreate
  // (ICreate does not support referencing attachments directly; only content_body)

  // Attempt to create a post with duplicate title (in the same community): should fail
  await TestValidator.error("duplicate title post creation fails", async () => {
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: textPostInput.title, // duplicate title
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  });

  // Attempt post creation without authentication: remove token and expect error
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated post creation fails", async () => {
    await api.functional.communityPlatform.member.posts.create(
      unauthConnection,
      {
        body: {
          community_platform_community_id: community.id,
          title: uniqueTitle("UnauthPost"),
          content_body: RandomGenerator.content({ paragraphs: 1 }),
          content_type: "text",
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  });
  // Note: Ban simulation would require a ban endpoint which is not available in this API set.
}
