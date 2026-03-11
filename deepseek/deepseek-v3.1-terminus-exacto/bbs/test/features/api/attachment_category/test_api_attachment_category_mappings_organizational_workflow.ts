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
import { generate_random_discussion_board_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_admin_articles_attachments_create";
import { generate_random_discussion_board_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_admin_attachment_categories_create";
import { generate_random_discussion_board_admin_attachment_category_mappings_create } from "../../../generate/generate_random_discussion_board_admin_attachment_category_mappings_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";
import { prepare_random_discussion_board_attachment_category_mapping } from "../../../prepare/prepare_random_discussion_board_attachment_category_mapping";

/**
 * Test administrator workflow for organizing and auditing attachment categorization system.
 * Authenticate as admin and member, create hierarchical categories, articles with attachments,
 * and test comprehensive search operations with various filters and pagination.
 */
export async function test_api_attachment_category_mappings_organizational_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: adminCredentials satisfies IDiscussionBoardAdmin.IJoin,
  });
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: adminCredentials satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Member setup for article creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: "https://test.example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://test.example.com" satisfies string & tags.Format<"uri">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: memberCredentials satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Create hierarchical attachment categories
  const rootCategories = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        name: RandomGenerator.name() + " Root " + (index + 1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        order_index: (index + 1) satisfies number & tags.Type<"int32">,
        is_active: true,
      }) satisfies IDiscussionBoardAttachmentCategory.ICreate,
  );
  const createdRootCategories: IDiscussionBoardAttachmentCategory[] = [];
  for (const categoryBody of rootCategories) {
    const category =
      await api.functional.discussionBoard.admin.attachment_categories.create(
        adminConnection,
        {
          body: categoryBody,
        },
      );
    typia.assert(category);
    createdRootCategories.push(category);
  }
  // Create child categories under each root
  const childCategories: IDiscussionBoardAttachmentCategory[] = [];
  for (const parent of createdRootCategories) {
    const childBody = {
      name: RandomGenerator.name() + " Child",
      description: RandomGenerator.paragraph({ sentences: 1 }),
      parent_id: parent.id satisfies string & tags.Format<"uuid">,
      order_index: typia.random<number & tags.Type<"int32">>(),
      is_active: true,
    } satisfies IDiscussionBoardAttachmentCategory.ICreate;
    const child =
      await api.functional.discussionBoard.admin.attachment_categories.create(
        adminConnection,
        {
          body: childBody,
        },
      );
    typia.assert(child);
    childCategories.push(child);
  }
  // 4. Create articles via member
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 5; i++) {
    const article = await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }
  // 5. Create diverse attachments for articles via admin
  const attachments: IDiscussionBoardAttachment[] = [];
  const fileTypes = [
    { ext: "pdf", mime: "application/pdf" },
    { ext: "jpg", mime: "image/jpeg" },
    { ext: "png", mime: "image/png" },
    { ext: "zip", mime: "application/zip" },
    {
      ext: "docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  ];
  for (let i = 0; i < articles.length; i++) {
    const fileType = fileTypes[i % fileTypes.length];
    const attachment =
      await api.functional.discussionBoard.admin.articles.attachments.create(
        adminConnection,
        {
          articleId: articles[i].id,
          body: {
            filename: `${RandomGenerator.alphabets(8)}.${fileType.ext}`,
            filetype: fileType.ext,
            mime_type: fileType.mime,
            size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }
  // 6. Create comprehensive categorization mappings
  const mappings: IDiscussionBoardAttachmentCategoryMapping[] = [];
  // Map each attachment to multiple categories (some to root, some to child)
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    // Map to a root category
    const rootCategory = RandomGenerator.pick(createdRootCategories);
    const rootMapping =
      await api.functional.discussionBoard.admin.attachment_category_mappings.create(
        adminConnection,
        {
          body: {
            discussion_board_attachment_id: attachment.id,
            discussion_board_attachment_category_id: rootCategory.id,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
        },
      );
    typia.assert(rootMapping);
    mappings.push(rootMapping);
    // For some attachments, also map to a child category
    if (i % 2 === 0 && childCategories.length > 0) {
      const childCategory = RandomGenerator.pick(childCategories);
      const childMapping =
        await api.functional.discussionBoard.admin.attachment_category_mappings.create(
          adminConnection,
          {
            body: {
              discussion_board_attachment_id: attachment.id,
              discussion_board_attachment_category_id: childCategory.id,
            } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
          },
        );
      typia.assert(childMapping);
      mappings.push(childMapping);
    }
  }
  // 7. Test search operation 1: Find all attachments in a specific category
  const testCategory = createdRootCategories[0];
  const searchByCategory =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          category_id: testCategory.id,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(searchByCategory);
  TestValidator.predicate(
    "should find mappings for specific category",
    searchByCategory.data.length > 0,
  );
  // Verify all results belong to the test category
  for (const mapping of searchByCategory.data) {
    TestValidator.equals(
      "category matches filter",
      mapping.category.id,
      testCategory.id,
    );
  }
  // 8. Test search operation 2: Find all categories for a specific attachment
  const testAttachment = attachments[0];
  const searchByAttachment =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          attachment_id: testAttachment.id,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(searchByAttachment);
  TestValidator.predicate(
    "should find categories for specific attachment",
    searchByAttachment.data.length > 0,
  );
  // Verify all results reference the test attachment
  for (const mapping of searchByAttachment.data) {
    TestValidator.equals(
      "attachment matches filter",
      mapping.attachment.id,
      testAttachment.id,
    );
  }
  // 9. Test search operation 3: Audit recent categorization with date range
  // Get creation timestamps from mappings
  const mappingDates = mappings.map((m) => new Date(m.created_at).getTime());
  const oldestDate = new Date(Math.min(...mappingDates)).toISOString();
  const newestDate = new Date(Math.max(...mappingDates)).toISOString();
  const searchByDateRange =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          created_at_start: oldestDate satisfies string &
            tags.Format<"date-time">,
          created_at_end: newestDate satisfies string &
            tags.Format<"date-time">,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(searchByDateRange);
  TestValidator.predicate(
    "should find mappings within date range",
    searchByDateRange.data.length >= mappings.length,
  );
  // 10. Test search operation 4: Pagination browsing
  const paginatedSearch =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination should return specified limit",
    paginatedSearch.data.length,
    2,
  );
  TestValidator.predicate(
    "should have pagination metadata",
    paginatedSearch.pagination.pages > 0 &&
      paginatedSearch.pagination.records >= paginatedSearch.data.length,
  );
  // 11. Validate mapping summaries include enough detail for administration
  for (const mapping of searchByCategory.data) {
    typia.assert(mapping.attachment);
    typia.assert(mapping.category);
    TestValidator.predicate(
      "attachment summary includes filename",
      mapping.attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment summary includes filetype",
      mapping.attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      "category summary includes name",
      mapping.category.name.length > 0,
    );
    // Check for hierarchical info in category summary
    TestValidator.notEquals(
      "category summary includes parent reference",
      mapping.category,
      undefined,
    );
  }
  // 12. Test combined filters
  const combinedSearch =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          attachment_id: testAttachment.id,
          category_id: testCategory.id,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // All results should match both filters
  for (const mapping of combinedSearch.data) {
    TestValidator.equals(
      "combined filter: attachment matches",
      mapping.attachment.id,
      testAttachment.id,
    );
    TestValidator.equals(
      "combined filter: category matches",
      mapping.category.id,
      testCategory.id,
    );
  }
  TestValidator.predicate(
    "search functionality supports administrative decision-making",
    searchByCategory.data.length > 0 &&
      searchByAttachment.data.length > 0 &&
      searchByDateRange.data.length > 0,
  );
}
