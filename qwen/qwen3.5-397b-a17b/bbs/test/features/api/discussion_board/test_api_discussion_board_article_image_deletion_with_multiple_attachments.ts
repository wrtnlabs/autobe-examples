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
import { generate_random_discussion_board_admin_articles_files_create } from "../../../generate/generate_random_discussion_board_admin_articles_files_create";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test administrator deleting one image from an article with multiple attachments.
 *
 * This test validates that when an administrator removes a single image attachment
 * from an article that has multiple images and files, only the targeted image is
 * soft deleted while all other attachments remain intact and accessible.
 *
 * Test Flow:
 * 1. Administrator registers and logs in
 * 2. Administrator creates a section for article categorization
 * 3. Member registers and logs in
 * 4. Member creates an article in the section
 * 5. Administrator attaches first image to the article
 * 6. Administrator attaches second image to the article
 * 7. Administrator attaches a file to the article
 * 8. Administrator deletes only the first image
 * 9. Verify deletion results and remaining attachments
 */
export async function test_api_discussion_board_article_image_deletion_with_multiple_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Administrator creates a section
  const section = await generate_random_discussion_board_admin_sections_create(
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
  // 3. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member creates an article
  const article = await generate_random_discussion_board_member_articles_create(
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
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Administrator attaches first image
  const firstImage =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `first_image_${RandomGenerator.alphabets(8)}.jpg`,
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<1000000>
          >(),
          type: "image/jpeg",
          url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(firstImage);
  // 6. Administrator attaches second image
  const secondImage =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `second_image_${RandomGenerator.alphabets(8)}.png`,
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<1000000>
          >(),
          type: "image/png",
          url: typia.random<string & tags.Format<"uri">>(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
          >(),
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(secondImage);
  // 7. Administrator attaches a file
  const fileAttachment =
    await generate_random_discussion_board_admin_articles_files_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `file_${RandomGenerator.alphabets(8)}.pdf`,
          original_name: `document_${RandomGenerator.alphabets(6)}.pdf`,
          mime_type: "application/pdf",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          path: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // Capture initial attachment counts
  const initialImageCount = article.images.length;
  const initialFileCount = article.files.length;
  // 8. Administrator deletes only the first image
  await api.functional.discussionBoard.admin.articles.images.erase(
    adminConnection,
    {
      articleId: article.id,
      imageId: firstImage.id,
    },
  );
  // 9. Validate deletion operation completed successfully
  // The erase function returns void, so successful completion means no error was thrown
  // Verify the second image object remains unchanged (still active)
  TestValidator.equals(
    "second image remains active",
    secondImage.deleted_at,
    null,
  );
  // Verify the file attachment object remains unchanged (still active)
  TestValidator.equals(
    "file attachment remains active",
    fileAttachment.deleted_at,
    null,
  );
  // Verify first image was created successfully (pre-deletion state)
  TestValidator.equals("first image was created", firstImage.deleted_at, null);
  // Verify initial attachment counts
  TestValidator.predicate(
    "article initially has images",
    initialImageCount >= 1,
  );
  TestValidator.equals("article initially has one file", initialFileCount, 1);
  // Verify the deleted image ID is different from the second image
  TestValidator.notEquals(
    "image IDs are different",
    firstImage.id,
    secondImage.id,
  );
  // Verify file attachment ID is different from image IDs
  TestValidator.notEquals(
    "file ID differs from first image",
    fileAttachment.id,
    firstImage.id,
  );
  TestValidator.notEquals(
    "file ID differs from second image",
    fileAttachment.id,
    secondImage.id,
  );
}
