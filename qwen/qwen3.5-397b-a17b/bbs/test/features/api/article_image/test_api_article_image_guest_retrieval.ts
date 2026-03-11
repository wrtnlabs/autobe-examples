import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_images_create } from "../../../generate/generate_random_discussion_board_member_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a guest user can successfully retrieve image attachment metadata from a publicly visible article.
 *
 * **Test Flow:**
 * 1. Administrator creates a discussion section for topic categorization
 * 2. Member registers and authenticates to the platform
 * 3. Member creates an article with title, content, and assigns it to the section
 * 4. Member uploads an image attachment to the article with metadata (filename, size, MIME type, URL, dimensions)
 * 5. Guest retrieves the image attachment details using the article ID and image ID
 *
 * **Validation Points:**
 * - Response contains complete image metadata: id, name, size, type, url, width, height, created_at, updated_at, deleted_at
 * - Image article relation returns article summary with id, title, author, tags, comments_count, created_at
 * - URL field provides valid CDN/storage access path
 * - Image dimensions (width, height) match the uploaded image specifications
 * - MIME type correctly identifies the image format (e.g., image/jpeg, image/png)
 * - Timestamps are properly formatted in ISO 8601 date-time format
 * - deleted_at is null indicating the image is active
 *
 * **Business Logic Verification:**
 * - Guest actors can access images on publicly visible articles without authentication
 * - Image is properly linked to parent article via discussion_board_article_id
 * - Soft delete status is checked (both article and image must have deleted_at = null)
 */
export async function test_api_article_image_guest_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates a section for article categorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member registers and logs in
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // 3. Member creates an article in the section
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        tags: [RandomGenerator.name(1), RandomGenerator.name(1)],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Member uploads an image attachment to the article
  const imageMimeType = RandomGenerator.pick([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const);
  const imageCreateBody = {
    name: `test-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<10000000>
    >(),
    type: imageMimeType,
    url: `https://cdn.example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;
  const image =
    await api.functional.discussionBoard.member.articles.images.create(
      memberConnection,
      {
        articleId: article.id,
        body: imageCreateBody,
      },
    );
  typia.assert(image);
  // 5. Guest retrieves the image attachment details (no authentication needed)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedImage =
    await api.functional.discussionBoard.articles.images.at(guestConnection, {
      articleId: article.id,
      imageId: image.id,
    });
  typia.assert(retrievedImage);
  // Validation: Verify image metadata matches what was uploaded
  TestValidator.equals(
    "image name matches",
    retrievedImage.name,
    imageCreateBody.name,
  );
  TestValidator.equals(
    "image size matches",
    retrievedImage.size,
    imageCreateBody.size,
  );
  TestValidator.equals(
    "image type matches",
    retrievedImage.type,
    imageCreateBody.type,
  );
  TestValidator.equals(
    "image url matches",
    retrievedImage.url,
    imageCreateBody.url,
  );
  TestValidator.equals(
    "image width matches",
    retrievedImage.width,
    imageCreateBody.width,
  );
  TestValidator.equals(
    "image height matches",
    retrievedImage.height,
    imageCreateBody.height,
  );
  // Validation: Verify article relation is properly linked
  TestValidator.equals(
    "article id matches",
    retrievedImage.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedImage.article.title,
    article.title,
  );
  TestValidator.equals(
    "article author matches member",
    retrievedImage.article.author.id,
    article.author.id,
  );
  // Validation: Verify soft delete status (should be null for active image)
  TestValidator.equals("image not deleted", retrievedImage.deleted_at, null);
}
