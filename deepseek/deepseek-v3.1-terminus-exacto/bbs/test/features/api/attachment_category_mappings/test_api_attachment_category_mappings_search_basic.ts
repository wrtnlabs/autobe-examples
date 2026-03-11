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

export async function test_api_attachment_category_mappings_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate using utility function
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
    },
  });
  // Create article as member using generation function
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // Create attachment for the article using generation function
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "test-file.pdf",
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(attachment);
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Create attachment category as admin using generation function
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
        },
      },
    );
  typia.assert(category);
  // Create super admin connection and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  // Search attachment-category mappings with no filters
  const searchResult =
    await api.functional.discussionBoard.superAdmin.attachment_category_mappings.index(
      superAdminConnection,
      {
        body: {
          // Empty filters to retrieve all mappings
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult.data),
  );
  // Validate pagination metadata
  TestValidator.equals("current page is 1", searchResult.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate each mapping summary structure
  for (const mapping of searchResult.data) {
    typia.assert(mapping);
    // Validate mapping ID and timestamp
    TestValidator.predicate("mapping has valid ID", mapping.id.length > 0);
    TestValidator.predicate(
      "mapping has creation timestamp",
      mapping.created_at.length > 0,
    );
    // Validate attachment summary
    typia.assert(mapping.attachment);
    TestValidator.predicate(
      "attachment has valid ID",
      mapping.attachment.id.length > 0,
    );
    TestValidator.predicate(
      "attachment has filename",
      mapping.attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment has filetype",
      mapping.attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      "attachment has mime type",
      mapping.attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      "attachment has size",
      mapping.attachment.size_bytes >= 0,
    );
    TestValidator.predicate(
      "attachment has article reference",
      mapping.attachment.article.id.length > 0,
    );
    // Validate category summary
    typia.assert(mapping.category);
    TestValidator.predicate(
      "category has valid ID",
      mapping.category.id.length > 0,
    );
    TestValidator.predicate(
      "category has name",
      mapping.category.name.length > 0,
    );
    TestValidator.predicate(
      "category has order index",
      mapping.category.order_index >= 0,
    );
    TestValidator.predicate(
      "category has active status",
      typeof mapping.category.is_active === "boolean",
    );
    TestValidator.predicate(
      "category has creation timestamp",
      mapping.category.created_at.length > 0,
    );
  }
}
