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

export async function test_api_attachment_category_mappings_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create test categories
  const category1 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order_index: 1,
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(category1);
  const category2 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          order_index: 2,
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(category2);
  // 3. Create test article for attachments using member connection
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
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Note: Section creation is not available in the provided API, so we'll use a valid section ID
  // This assumes there's at least one existing section in the system
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create test attachments using admin connection
  const attachment1 =
    await generate_random_discussion_board_admin_articles_attachments_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "document.pdf",
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  const attachment2 =
    await generate_random_discussion_board_admin_articles_attachments_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "image.jpg",
          filetype: "jpg", 
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  // 5. Create mapping relationships
  const mapping1 =
    await generate_random_discussion_board_admin_attachment_category_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_attachment_id: attachment1.id,
          discussion_board_attachment_category_id: category1.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping1);
  const mapping2 =
    await generate_random_discussion_board_admin_attachment_category_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_attachment_id: attachment2.id,
          discussion_board_attachment_category_id: category1.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping2);
  const mapping3 =
    await generate_random_discussion_board_admin_attachment_category_mappings_create(
      adminConnection,
      {
        body: {
          discussion_board_attachment_id: attachment1.id,
          discussion_board_attachment_category_id: category2.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping3);
  // 6. Test 1: Empty search (all mappings)
  const allMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(allMappings);
  TestValidator.predicate(
    "all mappings should return data",
    allMappings.data.length >= 3,
  );
  TestValidator.predicate( // Fixed: changed from .equals to .predicate for boolean expression
    "pagination should have records",
    allMappings.pagination.records >= 3,
  );
  // 7. Test 2: Filter by specific attachment ID
  const attachment1Mappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          attachment_id: attachment1.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(attachment1Mappings);
  TestValidator.predicate(
    "attachment1 mappings should have 2 entries",
    attachment1Mappings.data.length === 2,
  );
  TestValidator.predicate( // Fixed: changed from .equals to .predicate for boolean expression
    "all mappings should belong to attachment1",
    attachment1Mappings.data.every((m) => m.attachment.id === attachment1.id),
  );
  // 8. Test 3: Filter by specific category ID
  const category1Mappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          category_id: category1.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(category1Mappings);
  TestValidator.predicate(
    "category1 mappings should have 2 entries",
    category1Mappings.data.length === 2,
  );
  TestValidator.predicate( // Fixed: changed from .equals to .predicate for boolean expression
    "all mappings should belong to category1",
    category1Mappings.data.every((m) => m.category.id === category1.id),
  );
  // 9. Test 4: Date range filtering
  const recentMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(recentMappings);
  TestValidator.predicate(
    "recent mappings should include our test data",
    recentMappings.data.length >= 3,
  );
  // 10. Test 5: Combined filters
  const combinedMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          attachment_id: attachment1.id,
          category_id: category2.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(combinedMappings);
  TestValidator.predicate(
    "combined filter should return exactly 1 mapping",
    combinedMappings.data.length === 1,
  );
  TestValidator.predicate( // Fixed: changed from .equals to .predicate for boolean expression
    "mapping should match both criteria",
    combinedMappings.data[0].attachment.id === attachment1.id &&
      combinedMappings.data[0].category.id === category2.id,
  );
  // 11. Test 6: Pagination
  const paginatedMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(paginatedMappings);
  TestValidator.equals(
    "page 1 should have 2 items",
    paginatedMappings.data.length,
    2,
  );
  TestValidator.equals(
    "limit should be 2",
    paginatedMappings.pagination.limit,
    2,
  );
  TestValidator.equals(
    "current page should be 1",
    paginatedMappings.pagination.current,
    1,
  );
  // 12. Validate mapping summaries
  const testMapping = allMappings.data.find((m) => m.id === mapping1.id);
  TestValidator.predicate("mapping should exist in results", !!testMapping);
  TestValidator.equals(
    "mapping should have correct attachment",
    testMapping!.attachment.id,
    attachment1.id,
  );
  TestValidator.equals(
    "mapping should have correct category",
    testMapping!.category.id,
    category1.id,
  );
  TestValidator.predicate(
    "mapping should have creation timestamp",
    !!testMapping!.created_at,
  );
}