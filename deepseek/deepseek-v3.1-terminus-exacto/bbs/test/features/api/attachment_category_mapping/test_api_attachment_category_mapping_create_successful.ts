import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import type { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_attachments_create";
import { generate_random_discussion_board_super_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_super_admin_attachment_categories_create";
import { generate_random_discussion_board_super_admin_attachment_category_mappings_create } from "../../../generate/generate_random_discussion_board_super_admin_attachment_category_mappings_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";
import { prepare_random_discussion_board_attachment_category_mapping } from "../../../prepare/prepare_random_discussion_board_attachment_category_mapping";

export async function test_api_attachment_category_mapping_create_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member user
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
  // Note: Section creation is not available in the provided API functions
  // Using a random UUID for section ID as a workaround since section creation endpoint is not provided
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create article as member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 4. Create attachment for the article
  const attachment =
    await generate_random_discussion_board_super_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: `test-file-${RandomGenerator.alphaNumeric(8)}.pdf`,
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 5. Create attachment category
  const category =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Documents",
          description: "Document files category",
          parent_id: null,
          order_index: 1,
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(category);
  // 6. Create attachment-category mapping
  const mapping =
    await generate_random_discussion_board_super_admin_attachment_category_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_attachment_id: attachment.id,
          discussion_board_attachment_category_id: category.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping);
  // 7. Validate mapping relationship
  TestValidator.equals(
    "mapping ID should be UUID",
    typeof mapping.id,
    "string",
  );
  TestValidator.equals(
    "attachment ID should match",
    mapping.attachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "category ID should match",
    mapping.category.id,
    category.id,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    !isNaN(new Date(mapping.created_at).getTime()),
  );
  // Validate attachment summary
  TestValidator.equals(
    "attachment filename should match",
    mapping.attachment.filename,
    attachment.filename,
  );
  TestValidator.equals(
    "attachment filetype should match",
    mapping.attachment.filetype,
    attachment.filetype,
  );
  TestValidator.equals(
    "attachment mime_type should match",
    mapping.attachment.mime_type,
    attachment.mime_type,
  );
  // Validate category summary
  TestValidator.equals(
    "category name should match",
    mapping.category.name,
    category.name,
  );
  TestValidator.equals(
    "category order_index should match",
    mapping.category.order_index,
    category.orderIndex,
  );
  TestValidator.equals(
    "category is_active should match",
    mapping.category.is_active,
    category.isActive,
  );
}
