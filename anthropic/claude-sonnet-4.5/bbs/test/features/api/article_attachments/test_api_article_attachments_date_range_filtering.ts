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
 * Test attachment filtering by upload date ranges to track content updates over
 * time.
 *
 * This test validates the date range filtering functionality for article
 * attachments, which enables users to track when supporting materials were
 * added to discussions. The test creates a complete testing environment and
 * uploads attachments, then uses the actual created_at timestamps to test date
 * filtering scenarios.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category for organization
 * 3. Create member account and authenticate
 * 4. Create article to hold attachments
 * 5. Upload multiple attachments
 * 6. Test uploaded_after filter with specific timestamp
 * 7. Test uploaded_before filter with specific timestamp
 * 8. Test combined date range with both uploaded_after and uploaded_before
 * 9. Verify omitting date filters returns all attachments
 * 10. Validate ISO 8601 datetime format handling and timezone support
 */
export async function test_api_article_attachments_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create moderator account and authenticate
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create article category
  const categoryName = RandomGenerator.name(2);
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, "-"),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account and authenticate
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 4. Create article to hold attachments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 5. Upload multiple attachments and collect their timestamps
  const attachment1 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "pdf",
          size: 102400,
          original_filename: "research-paper-1.pdf",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment1);

  const attachment2 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: 204800,
          original_filename: "chart-analysis.png",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.png`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment2);

  const attachment3 =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "file",
          format: "xlsx",
          size: 153600,
          original_filename: "data-spreadsheet.xlsx",
          storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.xlsx`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment3);

  const allAttachments = [attachment1, attachment2, attachment3];
  const timestamps = allAttachments
    .map((a) => new Date(a.created_at).getTime())
    .sort((a, b) => a - b);
  const earliestTime = new Date(timestamps[0]);
  const middleTime = new Date(timestamps[1]);
  const latestTime = new Date(timestamps[2]);

  // 6. Test uploaded_after filter - find attachments uploaded on or after middle timestamp
  const afterFilterResult =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          uploaded_after: middleTime.toISOString(),
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(afterFilterResult);
  TestValidator.predicate(
    "uploaded_after filter returns correct number of attachments",
    afterFilterResult.data.length >= 1,
  );
  for (const attachment of afterFilterResult.data) {
    TestValidator.predicate(
      "attachment created_at is on or after the filter date",
      new Date(attachment.created_at).getTime() >= middleTime.getTime(),
    );
  }

  // 7. Test uploaded_before filter - find attachments uploaded on or before middle timestamp
  const beforeFilterResult =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          uploaded_before: middleTime.toISOString(),
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(beforeFilterResult);
  TestValidator.predicate(
    "uploaded_before filter returns correct number of attachments",
    beforeFilterResult.data.length >= 1,
  );
  for (const attachment of beforeFilterResult.data) {
    TestValidator.predicate(
      "attachment created_at is on or before the filter date",
      new Date(attachment.created_at).getTime() <= middleTime.getTime(),
    );
  }

  // 8. Test combined date range filter - find attachments within a specific time window
  const dateRangeResult =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          uploaded_after: earliestTime.toISOString(),
          uploaded_before: latestTime.toISOString(),
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns attachments within the time window",
    dateRangeResult.data.length === 3,
  );
  for (const attachment of dateRangeResult.data) {
    const attachmentTime = new Date(attachment.created_at).getTime();
    TestValidator.predicate(
      "attachment created_at is within the specified date range",
      attachmentTime >= earliestTime.getTime() &&
        attachmentTime <= latestTime.getTime(),
    );
  }

  // 9. Verify omitting date filters returns all attachments
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
    "omitting date filters returns all attachments",
    allAttachmentsResult.data.length,
    3,
  );

  // 10. Validate ISO 8601 datetime format handling
  for (const attachment of allAttachmentsResult.data) {
    TestValidator.predicate(
      "attachment created_at is in ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(attachment.created_at),
    );
  }
}
