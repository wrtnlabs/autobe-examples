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

export async function test_api_attachment_category_mapping_invalid_references(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create member connection
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
  // Create article for attachment using utility function
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
  // Create attachment using utility function
  const attachment =
    await generate_random_discussion_board_super_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "test.pdf",
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(attachment);
  // Create active category using utility function
  const activeCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
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
  typia.assert(activeCategory);
  // Create inactive category using utility function
  const inactiveCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          order_index: typia.random<number & tags.Type<"int32">>(),
          is_active: false,
        },
      },
    );
  typia.assert(inactiveCategory);
  // Test 1: Non-existent attachment ID
  await TestValidator.error(
    "should fail with non-existent attachment ID",
    async () => {
      await generate_random_discussion_board_super_admin_attachment_category_mappings_create(
        superAdminConnection,
        {
          body: {
            discussion_board_attachment_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            discussion_board_attachment_category_id: activeCategory.id,
          },
        },
      );
    },
  );
  // Test 2: Non-existent category ID
  await TestValidator.error(
    "should fail with non-existent category ID",
    async () => {
      await generate_random_discussion_board_super_admin_attachment_category_mappings_create(
        superAdminConnection,
        {
          body: {
            discussion_board_attachment_id: attachment.id,
            discussion_board_attachment_category_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
  // Test 3: Inactive category
  await TestValidator.error("should fail with inactive category", async () => {
    await generate_random_discussion_board_super_admin_attachment_category_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_attachment_id: attachment.id,
          discussion_board_attachment_category_id: inactiveCategory.id,
        },
      },
    );
  });
  // Test 4: Valid mapping should succeed
  const validMapping =
    await generate_random_discussion_board_super_admin_attachment_category_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_attachment_id: attachment.id,
          discussion_board_attachment_category_id: activeCategory.id,
        },
      },
    );
  typia.assert(validMapping);
  // Verify valid mapping properties
  TestValidator.equals(
    "attachment ID matches",
    validMapping.attachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "category ID matches",
    validMapping.category.id,
    activeCategory.id,
  );
}
