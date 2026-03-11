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

export async function test_api_attachment_category_mappings_filtering_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create member connection and article
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
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create multiple attachment categories
  const categories = await ArrayUtil.asyncRepeat(3, async () => {
    const category =
      await generate_random_discussion_board_admin_attachment_categories_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parent_id: null,
            order_index: typia.random<number & tags.Type<"int32">>(),
            is_active: true,
          } satisfies IDiscussionBoardAttachmentCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });
  // Create multiple file attachments with varied timestamps
  const attachments = await ArrayUtil.asyncRepeat(3, async () => {
    const attachment =
      await generate_random_discussion_board_admin_articles_attachments_create(
        adminConnection,
        {
          params: { articleId: article.id },
          body: {
            filename: `${RandomGenerator.name()}.txt`,
            filetype: "txt",
            mime_type: "text/plain",
            size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    return attachment;
  });
  // Create complex mapping relationships with different creation times
  const mappings = [];
  // Attachment 1 has multiple categories
  for (const category of categories) {
    const mapping =
      await generate_random_discussion_board_admin_attachment_category_mappings_create(
        adminConnection,
        {
          body: {
            discussion_board_attachment_id: attachments[0].id,
            discussion_board_attachment_category_id: category.id,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
        },
      );
    typia.assert(mapping);
    mappings.push(mapping);
  }
  // Category 1 has multiple attachments
  for (let i = 1; i < attachments.length; i++) {
    const mapping =
      await generate_random_discussion_board_admin_attachment_category_mappings_create(
        adminConnection,
        {
          body: {
            discussion_board_attachment_id: attachments[i].id,
            discussion_board_attachment_category_id: categories[0].id,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
        },
      );
    typia.assert(mapping);
    mappings.push(mapping);
  }
  // Test 1: Search for mappings of a specific attachment that has multiple category assignments
  const attachmentMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          attachment_id: attachments[0].id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(attachmentMappings);
  TestValidator.equals(
    "attachment with multiple categories returns all mappings",
    attachmentMappings.data.length,
    categories.length,
  );
  // Test 2: Search for mappings of a specific category that has multiple attachments assigned
  const categoryMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          category_id: categories[0].id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(categoryMappings);
  TestValidator.equals(
    "category with multiple attachments returns all mappings",
    categoryMappings.data.length,
    attachments.length,
  );
  // Test 3: Search with date range that includes only some mappings
  const latestMapping = mappings[mappings.length - 1];
  const dateRangeMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          created_at_start: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(), // 1 day ago
          created_at_end: new Date().toISOString(),
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(dateRangeMappings);
  TestValidator.predicate(
    "date range filtering returns some results",
    dateRangeMappings.data.length > 0,
  );
  // Test 4: Search with filters that should return empty result set
  const emptyMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          attachment_id: typia.random<string & tags.Format<"uuid">>(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(emptyMappings);
  TestValidator.equals(
    "non-existent IDs return empty results",
    emptyMappings.data.length,
    0,
  );
  // Test 5: Pagination edge cases
  const paginatedMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(paginatedMappings);
  TestValidator.equals(
    "pagination returns exactly one result",
    paginatedMappings.data.length,
    1,
  );
  // Test beyond available pages
  const beyondPageMappings =
    await api.functional.discussionBoard.admin.attachment_category_mappings.index(
      adminConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(beyondPageMappings);
  TestValidator.equals(
    "page beyond available results returns empty",
    beyondPageMappings.data.length,
    0,
  );
}
