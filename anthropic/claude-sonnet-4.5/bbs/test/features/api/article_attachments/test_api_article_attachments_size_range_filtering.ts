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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";

/**
 * Test attachment filtering by file size ranges to help users find large
 * documents or small images efficiently.
 *
 * This test validates the size-based filtering functionality for article
 * attachments, ensuring users can efficiently locate files based on their size
 * requirements. The test covers minimum size, maximum size, combined range
 * filtering, and verifies that size values are accurately reported.
 *
 * Test workflow:
 *
 * 1. Create moderator account for category management
 * 2. Create article category
 * 3. Create member account for content creation
 * 4. Create article to attach files to
 * 5. Upload attachments with varied sizes (small, medium, large)
 * 6. Test min_size filtering (find files above threshold)
 * 7. Test max_size filtering (find files below threshold)
 * 8. Test combined min/max size range filtering
 * 9. Verify omitting size filters returns all attachments
 * 10. Validate size field accuracy in responses
 */
export async function test_api_article_attachments_size_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.com/moderator/join",
      referrer: "https://test.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic topics and policies",
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
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.com/member/join",
      referrer: "https://test.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload attachments with varied sizes
  // Small image: ~100KB (100,000 bytes)
  const smallImage =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "jpeg",
          size: 100000,
          original_filename: "small-thumbnail.jpeg",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.jpeg`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(smallImage);

  // Medium document: ~2MB (2,000,000 bytes)
  const mediumDoc =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: 2000000,
          original_filename: "medium-report.pdf",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(mediumDoc);

  // Large PDF: ~8MB (8,000,000 bytes)
  const largePdf =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: 8000000,
          original_filename: "large-presentation.pdf",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(largePdf);

  // Additional small image for testing
  const anotherSmallImage =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: 150000,
          original_filename: "small-icon.png",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.png`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(anotherSmallImage);

  // Step 6: Test min_size filtering - find files 2MB or larger
  const largeFilesResult =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          min_size: 2000000,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(largeFilesResult);

  TestValidator.equals(
    "min_size filter should return 2 files (2MB and 8MB)",
    largeFilesResult.data.length,
    2,
  );

  TestValidator.predicate(
    "all files in min_size result should be >= 2MB",
    largeFilesResult.data.every((att) => att.size >= 2000000),
  );

  // Step 7: Test max_size filtering - find files under 500KB
  const smallFilesResult =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          max_size: 500000,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(smallFilesResult);

  TestValidator.equals(
    "max_size filter should return 2 small images",
    smallFilesResult.data.length,
    2,
  );

  TestValidator.predicate(
    "all files in max_size result should be <= 500KB",
    smallFilesResult.data.every((att) => att.size <= 500000),
  );

  // Step 8: Test combined min/max size range filtering (between 1MB and 5MB)
  const mediumRangeResult =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          min_size: 1000000,
          max_size: 5000000,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(mediumRangeResult);

  TestValidator.equals(
    "size range filter should return 1 file (2MB document)",
    mediumRangeResult.data.length,
    1,
  );

  TestValidator.predicate(
    "file in range result should be between 1MB and 5MB",
    mediumRangeResult.data.every(
      (att) => att.size >= 1000000 && att.size <= 5000000,
    ),
  );

  // Step 9: Verify omitting size filters returns all attachments
  const allAttachmentsResult =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(allAttachmentsResult);

  TestValidator.equals(
    "no size filter should return all 4 attachments",
    allAttachmentsResult.data.length,
    4,
  );

  // Step 10: Validate size field accuracy
  const foundSmallImage = allAttachmentsResult.data.find(
    (att) => att.id === smallImage.id,
  );
  typia.assertGuard(foundSmallImage!);

  TestValidator.equals(
    "small image size should be accurate",
    foundSmallImage.size,
    100000,
  );

  const foundMediumDoc = allAttachmentsResult.data.find(
    (att) => att.id === mediumDoc.id,
  );
  typia.assertGuard(foundMediumDoc!);

  TestValidator.equals(
    "medium document size should be accurate",
    foundMediumDoc.size,
    2000000,
  );

  const foundLargePdf = allAttachmentsResult.data.find(
    (att) => att.id === largePdf.id,
  );
  typia.assertGuard(foundLargePdf!);

  TestValidator.equals(
    "large PDF size should be accurate",
    foundLargePdf.size,
    8000000,
  );

  // Verify pagination metadata
  TestValidator.equals(
    "pagination total records should match attachment count",
    allAttachmentsResult.pagination.records,
    4,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    allAttachmentsResult.pagination.current,
    1,
  );
}
