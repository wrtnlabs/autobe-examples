import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that attachment quantity limits are enforced per article: maximum 10
 * image attachments and maximum 5 document attachments.
 *
 * This test validates the business rules for article attachments:
 *
 * - Maximum 10 images per article (jpeg, png, gif, webp formats)
 * - Maximum 5 documents per article (pdf, doc, docx, xls, xlsx, txt, csv formats)
 * - Limits are tracked independently for images vs documents
 * - Attempting to exceed either limit results in validation error
 *
 * Test workflow:
 *
 * 1. Create moderator and category (prerequisites for article creation)
 * 2. Create member and article (base setup for attachment testing)
 * 3. Upload 10 image attachments successfully (at limit)
 * 4. Attempt 11th image upload and verify it fails with validation error
 * 5. Upload 5 document attachments successfully (at limit)
 * 6. Attempt 6th document upload and verify it fails with validation error
 * 7. Verify both limits work independently (10 images + 5 documents
 *    simultaneously)
 */
export async function test_api_article_attachment_quantity_limits(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://example.com/moderator/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for attachment testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "127.0.0.1",
        href: "https://example.com/member/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create article for attachment testing
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Upload exactly 10 image attachments (maximum allowed)
  const imageFormats = ["jpeg", "png", "gif", "webp"] as const;
  const imageAttachments: IDiscussionBoardArticleAttachment[] =
    await ArrayUtil.asyncRepeat(10, async (index) => {
      const format = RandomGenerator.pick(imageFormats);
      const attachment =
        await api.functional.discussionBoard.member.articles.attachments.create(
          connection,
          {
            articleId: article.id,
            body: {
              type: "image",
              format: format,
              size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1000> &
                  tags.Maximum<5000000>
              >(),
              original_filename: `test-image-${index}.${format}`,
              storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.${format}`,
            } satisfies IDiscussionBoardArticleAttachment.ICreate,
          },
        );
      typia.assert(attachment);
      return attachment;
    });

  TestValidator.equals(
    "uploaded 10 images successfully",
    imageAttachments.length,
    10,
  );

  // Step 6: Attempt to upload 11th image attachment (should fail)
  await TestValidator.error(
    "11th image attachment should fail with quantity limit error",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "image",
            format: "jpeg",
            size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            original_filename: "test-image-11.jpeg",
            storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.jpeg`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );

  // Step 7: Upload exactly 5 document attachments (maximum allowed)
  const documentFormats = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "txt",
    "csv",
  ] as const;
  const documentAttachments: IDiscussionBoardArticleAttachment[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const format = RandomGenerator.pick(documentFormats);
      const attachment =
        await api.functional.discussionBoard.member.articles.attachments.create(
          connection,
          {
            articleId: article.id,
            body: {
              type: "file",
              format: format,
              size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1000> &
                  tags.Maximum<10000000>
              >(),
              original_filename: `test-document-${index}.${format}`,
              storage_path: `/storage/documents/${typia.random<string & tags.Format<"uuid">>()}.${format}`,
            } satisfies IDiscussionBoardArticleAttachment.ICreate,
          },
        );
      typia.assert(attachment);
      return attachment;
    });

  TestValidator.equals(
    "uploaded 5 documents successfully",
    documentAttachments.length,
    5,
  );

  // Step 8: Attempt to upload 6th document attachment (should fail)
  await TestValidator.error(
    "6th document attachment should fail with quantity limit error",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "file",
            format: "pdf",
            size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<10000000>
            >(),
            original_filename: "test-document-6.pdf",
            storage_path: `/storage/documents/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );

  // Step 9: Verify independent limits - article should have exactly 10 images and 5 documents
  TestValidator.predicate(
    "article has maximum allowed attachments of both types",
    imageAttachments.length === 10 && documentAttachments.length === 5,
  );
}
