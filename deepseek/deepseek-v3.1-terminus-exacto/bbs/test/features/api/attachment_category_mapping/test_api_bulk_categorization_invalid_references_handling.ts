import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_admin_articles_attachments_create";
import { generate_random_discussion_board_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_admin_attachment_categories_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";

export async function test_api_bulk_categorization_invalid_references_handling(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create member for article creation
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
  // Create valid articles
  const validArticle1 =
    await generate_random_discussion_board_member_articles_create(
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
  typia.assert(validArticle1);
  const validArticle2 =
    await generate_random_discussion_board_member_articles_create(
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
  typia.assert(validArticle2);
  // Create valid attachment categories
  const validCategory1 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(validCategory1);
  const validCategory2 =
    await generate_random_discussion_board_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          order_index: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(validCategory2);
  // Add attachments to enable categorization
  const attachment1 =
    await generate_random_discussion_board_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: { articleId: validArticle1.id },
        body: {
          filename: `${RandomGenerator.name()}.jpg`,
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  const attachment2 =
    await generate_random_discussion_board_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: { articleId: validArticle2.id },
        body: {
          filename: `${RandomGenerator.name()}.pdf`,
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  // Since the bulk categorization endpoint expects a different structure than what's available in the DTOs,
  // and based on the scenario description mentioning "bulk categorization with invalid article and section references",
  // this test will focus on validating that the endpoint properly handles invalid references
  // Test with non-existent attachment ID
  await TestValidator.error(
    "should reject non-existent attachment ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.bulk.categorize.bulkCategorize(
        superAdminConnection,
        {
          body: {
            attachment_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent attachment
            category_id: validCategory1.id,
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    },
  );
  // Test with non-existent category ID
  await TestValidator.error(
    "should reject non-existent category ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.bulk.categorize.bulkCategorize(
        superAdminConnection,
        {
          body: {
            attachment_id: attachment1.id,
            category_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent category
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    },
  );
  // Test with both invalid references
  await TestValidator.error(
    "should reject completely invalid references",
    async () => {
      await api.functional.discussionBoard.superAdmin.bulk.categorize.bulkCategorize(
        superAdminConnection,
        {
          body: {
            attachment_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent attachment
            category_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent category
          } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
        },
      );
    },
  );
  // Test valid categorization to ensure the endpoint works with proper references
  const validResponse =
    await api.functional.discussionBoard.superAdmin.bulk.categorize.bulkCategorize(
      superAdminConnection,
      {
        body: {
          attachment_id: attachment1.id,
          category_id: validCategory1.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.IRequest,
      },
    );
  typia.assert(validResponse);
  // Validate the response structure for successful operation
  TestValidator.predicate(
    "valid response has mappings array",
    Array.isArray(validResponse.mappings),
  );
  if (validResponse.mappings.length > 0) {
    const mapping = validResponse.mappings[0];
    TestValidator.equals(
      "successful mapping has id",
      typeof mapping.id,
      "string",
    );
    TestValidator.equals(
      "successful mapping attachment matches",
      mapping.attachment_id,
      attachment1.id,
    );
    TestValidator.equals(
      "successful mapping category matches",
      mapping.category_id,
      validCategory1.id,
    );
    TestValidator.predicate(
      "successful mapping has success true",
      mapping.success === true,
    );
    TestValidator.equals(
      "successful mapping has no error message",
      mapping.error_message,
      undefined,
    );
    TestValidator.equals(
      "successful mapping has created_at",
      typeof mapping.created_at,
      "string",
    );
  }
}
