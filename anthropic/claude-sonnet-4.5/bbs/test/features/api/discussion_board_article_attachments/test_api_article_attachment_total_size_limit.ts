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
 * Test that the combined total size of all attachments per article is limited
 * to 25MB.
 *
 * This test validates the business rule that prevents individual articles from
 * consuming excessive storage resources by enforcing a 25MB total attachment
 * size limit per article. The limit applies to all attachment types
 * collectively (images + documents).
 *
 * Test Flow:
 *
 * 1. Create moderator and category
 * 2. Create member and article
 * 3. Upload multiple attachments approaching 25MB limit (should succeed)
 * 4. Attempt to upload attachment that would exceed 25MB (should fail)
 * 5. Test various combinations to ensure comprehensive validation
 */
export async function test_api_article_attachment_total_size_limit(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category (as moderator)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for attachment size limit testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create article for testing attachments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Article for Attachment Size Limit Testing",
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload 4 images of 5MB each (20MB total) - should succeed
  const imageAttachments = await ArrayUtil.asyncRepeat(4, async (index) => {
    const attachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "image",
            format: "jpeg",
            size: 5 * 1024 * 1024,
            original_filename: `test-image-${index + 1}.jpeg`,
            storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.jpeg`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    return attachment;
  });

  TestValidator.equals(
    "uploaded 4 images successfully",
    imageAttachments.length,
    4,
  );

  // Step 6: Upload documents totaling 4.9MB (24.9MB combined total) - should succeed
  const documentSizes = [
    2 * 1024 * 1024,
    Math.floor(1.5 * 1024 * 1024),
    Math.floor(1.4 * 1024 * 1024),
  ];
  const documentAttachments = await ArrayUtil.asyncRepeat(
    documentSizes.length,
    async (index) => {
      const attachment =
        await api.functional.discussionBoard.member.articles.attachments.create(
          connection,
          {
            articleId: article.id,
            body: {
              type: "file",
              format: "pdf",
              size: documentSizes[index],
              original_filename: `document-${index + 1}.pdf`,
              storage_path: `/storage/documents/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
            } satisfies IDiscussionBoardArticleAttachment.ICreate,
          },
        );
      typia.assert(attachment);
      return attachment;
    },
  );

  TestValidator.equals(
    "uploaded 3 documents successfully",
    documentAttachments.length,
    3,
  );

  // Verify total size is under 25MB
  const totalSizeBeforeExceeding =
    imageAttachments.reduce((sum, att) => sum + att.size, 0) +
    documentAttachments.reduce((sum, att) => sum + att.size, 0);

  TestValidator.predicate(
    "total size is under 25MB",
    totalSizeBeforeExceeding < 25 * 1024 * 1024,
  );

  // Step 7: Attempt to add one more attachment that would push total over 25MB - should fail
  await TestValidator.error(
    "cannot exceed 25MB total attachment size limit",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "image",
            format: "png",
            size: 200 * 1024,
            original_filename: "exceeding-limit.png",
            storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.png`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );

  // Step 8: Test scenario with many small files exceeding 25MB
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      ip: "127.0.0.1",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Article for Many Small Files Test",
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  const smallFileSize = 500 * 1024;
  const smallFilesCount = 50;
  const totalSmallFilesSize = smallFileSize * smallFilesCount;

  TestValidator.predicate(
    "many small files would exceed 25MB",
    totalSmallFilesSize > 25 * 1024 * 1024,
  );

  let uploadedSmallFiles = 0;
  let errorOccurred = false;

  for (let i = 0; i < smallFilesCount; i++) {
    try {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article2.id,
          body: {
            type: "image",
            format: "png",
            size: smallFileSize,
            original_filename: `small-file-${i + 1}.png`,
            storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.png`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
      uploadedSmallFiles++;
    } catch (error) {
      errorOccurred = true;
      break;
    }
  }

  TestValidator.predicate(
    "error occurred before uploading all small files",
    errorOccurred,
  );

  TestValidator.predicate(
    "uploaded files are under 25MB limit",
    uploadedSmallFiles * smallFileSize < 25 * 1024 * 1024,
  );

  // Step 9: Test scenario with mixed large images and documents
  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Article for Mixed Large Files Test",
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  const mixedAttachments = [
    { type: "image", format: "jpeg", size: Math.floor(4.8 * 1024 * 1024) },
    { type: "file", format: "pdf", size: Math.floor(9.5 * 1024 * 1024) },
    { type: "image", format: "png", size: Math.floor(4.5 * 1024 * 1024) },
    { type: "file", format: "docx", size: 6 * 1024 * 1024 },
  ];

  const totalMixedSize = mixedAttachments.reduce(
    (sum, att) => sum + att.size,
    0,
  );

  TestValidator.predicate(
    "mixed files total exceeds 25MB",
    totalMixedSize > 25 * 1024 * 1024,
  );

  let uploadedMixedCount = 0;
  let mixedErrorOccurred = false;

  for (const attData of mixedAttachments) {
    try {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article3.id,
          body: {
            type: attData.type,
            format: attData.format,
            size: attData.size,
            original_filename: `mixed-${uploadedMixedCount + 1}.${attData.format}`,
            storage_path: `/storage/${attData.type === "image" ? "images" : "documents"}/${typia.random<string & tags.Format<"uuid">>()}.${attData.format}`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
      uploadedMixedCount++;
    } catch (error) {
      mixedErrorOccurred = true;
      break;
    }
  }

  TestValidator.predicate(
    "error occurred with mixed large files",
    mixedErrorOccurred,
  );

  TestValidator.predicate(
    "uploaded mixed files are under 25MB",
    mixedAttachments
      .slice(0, uploadedMixedCount)
      .reduce((sum, att) => sum + att.size, 0) <
      25 * 1024 * 1024,
  );
}
