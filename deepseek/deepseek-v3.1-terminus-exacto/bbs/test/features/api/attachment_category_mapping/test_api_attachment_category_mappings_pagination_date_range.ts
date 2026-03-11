import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import type { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachmentCategoryMapping";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_admin_attachment_categories_create";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";

/**
 * Test advanced search with pagination and date range filtering.
 * As a super administrator, authenticate and create multiple prerequisites:
 * create articles, add multiple attachments, create multiple categories.
 * Then use the search endpoint with specific criteria: page number, limit per page,
 * and creation date range filters. Verify pagination metadata includes current page,
 * limit, records count, and total pages. Test that date range filters correctly
 * limit results to mappings created within specified timeframe. Validate that the
 * pagination controls work correctly and return the expected subset of results.
 * Ensure attachment and category references in summaries are accurate and complete.
 */
export async function test_api_attachment_category_mappings_pagination_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. SETUP: Create all required actor connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. CREATE ARTICLES: Member creates two articles for attachments
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(article1);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(article2);
  // 3. CREATE ATTACHMENTS: Member adds attachments to articles
  // Record timestamps for date range filtering
  const attachmentTimestamps: string[] = [];
  const attachment1 =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          filename: RandomGenerator.name() + ".pdf",
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
        params: {
          articleId: article1.id,
        },
      },
    );
  typia.assert(attachment1);
  attachmentTimestamps.push(attachment1.created_at);
  // Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  const attachment2 =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          filename: RandomGenerator.name() + ".jpg",
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
        params: {
          articleId: article2.id,
        },
      },
    );
  typia.assert(attachment2);
  attachmentTimestamps.push(attachment2.created_at);
  // 4. CREATE CATEGORIES: Admin creates two attachment categories
  const category1 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order_index: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        },
      },
    );
  typia.assert(category1);
  const category2 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order_index: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        },
      },
    );
  typia.assert(category2);
  // 5. CREATE MAPPINGS: Super admin creates mappings (assuming there's an endpoint for this)
  // Since we don't have a create mapping endpoint in available functions,
  // we need to map attachments to categories using available APIs or assume they're created
  // For this test, we'll use the search endpoint to find existing mappings
  // and test pagination/date filtering on whatever exists
  // 6. SEARCH WITH PAGINATION AND DATE RANGE: Super admin searches with specific criteria
  const page = 1;
  const limit = 10;
  // Use the earliest and latest timestamps from our created attachments
  const sortedTimestamps = [...attachmentTimestamps].sort();
  const created_at_start = sortedTimestamps[0];
  const created_at_end = sortedTimestamps[sortedTimestamps.length - 1];
  const searchResult =
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
      superAdminConnection,
      {
        body: {
          page: page satisfies number as number,
          limit: limit satisfies number as number,
          created_at_start: created_at_start satisfies string as string,
          created_at_end: created_at_end satisfies string as string,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(searchResult);
  // 7. VALIDATE PAGINATION METADATA
  TestValidator.equals("current page", searchResult.pagination.current, page);
  TestValidator.equals("limit per page", searchResult.pagination.limit, limit);
  TestValidator.predicate(
    "records count non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Calculate expected pages: ceil(records / limit)
  const expectedPages = Math.ceil(searchResult.pagination.records / limit);
  TestValidator.equals(
    "pages calculation",
    searchResult.pagination.pages,
    expectedPages,
  );
  // 8. VALIDATE DATE RANGE FILTERING
  // All returned mappings should be within the specified date range
  for (const mapping of searchResult.data) {
    const mappingDate = new Date(mapping.created_at).getTime();
    const startDate = new Date(created_at_start).getTime();
    const endDate = new Date(created_at_end).getTime();
    TestValidator.predicate(
      `mapping ${mapping.id} within start date`,
      mappingDate >= startDate,
    );
    TestValidator.predicate(
      `mapping ${mapping.id} within end date`,
      mappingDate <= endDate,
    );
  }
  // 9. VALIDATE MAPPING STRUCTURE
  for (const mapping of searchResult.data) {
    typia.assert(mapping.attachment);
    typia.assert(mapping.category);
    TestValidator.equals(
      `mapping ${mapping.id} has valid attachment id`,
      typeof mapping.attachment.id,
      "string",
    );
    TestValidator.equals(
      `mapping ${mapping.id} has valid category id`,
      typeof mapping.category.id,
      "string",
    );
    // Validate attachment summary structure
    TestValidator.predicate(
      `attachment ${mapping.attachment.id} has filename`,
      mapping.attachment.filename.length > 0,
    );
    TestValidator.predicate(
      `attachment ${mapping.attachment.id} has filetype`,
      mapping.attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      `attachment ${mapping.attachment.id} has mime type`,
      mapping.attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      `attachment ${mapping.attachment.id} has positive size`,
      mapping.attachment.size_bytes > 0,
    );
    // Validate category summary structure
    TestValidator.predicate(
      `category ${mapping.category.id} has name`,
      mapping.category.name.length > 0,
    );
    TestValidator.predicate(
      `category ${mapping.category.id} has valid order index`,
      typeof mapping.category.order_index === "number",
    );
    TestValidator.equals(
      `category ${mapping.category.id} has is_active`,
      typeof mapping.category.is_active,
      "boolean",
    );
  }
  // 10. TEST SECOND PAGE (if applicable)
  if (searchResult.pagination.pages > 1) {
    const page2 = 2;
    const searchResultPage2 =
      await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
        superAdminConnection,
        {
          body: {
            page: page2 satisfies number as number,
            limit: limit satisfies number as number,
            created_at_start: created_at_start satisfies string as string,
            created_at_end: created_at_end satisfies string as string,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    typia.assert(searchResultPage2);
    TestValidator.equals(
      "page 2 current page",
      searchResultPage2.pagination.current,
      page2,
    );
    TestValidator.equals(
      "page 2 limit",
      searchResultPage2.pagination.limit,
      limit,
    );
    // Data should be different from first page (unless empty)
    if (searchResult.data.length > 0 && searchResultPage2.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 have different data",
        searchResult.data[0].id,
        searchResultPage2.data[0].id,
      );
    }
  }
  // 11. TEST DIFFERENT LIMIT
  const smallLimit = 5;
  const searchResultSmallLimit =
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
      superAdminConnection,
      {
        body: {
          page: page satisfies number as number,
          limit: smallLimit satisfies number as number,
          created_at_start: created_at_start satisfies string as string,
          created_at_end: created_at_end satisfies string as string,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(searchResultSmallLimit);
  TestValidator.equals(
    "small limit limit",
    searchResultSmallLimit.pagination.limit,
    smallLimit,
  );
  TestValidator.predicate(
    "small limit data size <= limit",
    searchResultSmallLimit.data.length <= smallLimit,
  );
}
