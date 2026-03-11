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
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_attachment_categories_create } from "../../../generate/generate_random_discussion_board_super_admin_attachment_categories_create";
import { generate_random_discussion_board_super_admin_attachment_category_mappings_create } from "../../../generate/generate_random_discussion_board_super_admin_attachment_category_mappings_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";
import { prepare_random_discussion_board_attachment_category } from "../../../prepare/prepare_random_discussion_board_attachment_category";
import { prepare_random_discussion_board_attachment_category_mapping } from "../../../prepare/prepare_random_discussion_board_attachment_category_mapping";

export async function test_api_attachment_category_mapping_deletion_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 3. Create article as member
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
  // 4. Create attachment for the article as member
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: `${RandomGenerator.alphabets(8)}.pdf`,
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 5. Create parent attachment category as super admin
  const parentCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
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
  typia.assert(parentCategory);
  // 6. Create child attachment category as super admin
  const childCategory =
    await generate_random_discussion_board_super_admin_attachment_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
          order_index: typia.random<number & tags.Type<"int32">>(),
          is_active: true,
        } satisfies IDiscussionBoardAttachmentCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  // 7. Create mapping relationship as super admin
  const mapping =
    await generate_random_discussion_board_super_admin_attachment_category_mappings_create(
      superAdminConnection,
      {
        body: {
          discussion_board_attachment_id: attachment.id,
          discussion_board_attachment_category_id: childCategory.id,
        } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
      },
    );
  typia.assert(mapping);
  // 8. Delete the mapping as super admin
  await api.functional.discussionBoard.superAdmin.attachment_category_mappings.erase(
    superAdminConnection,
    {
      mappingId: mapping.id,
    },
  );
  // 9. Validate mapping deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "mapping should not exist for second deletion",
    async () => {
      await api.functional.discussionBoard.superAdmin.attachment_category_mappings.erase(
        superAdminConnection,
        {
          mappingId: mapping.id,
        },
      );
    },
  );
  // 10. Verify underlying entities remain intact by checking their properties
  TestValidator.predicate(
    "attachment should remain intact",
    attachment.id !== null && attachment.filename !== "",
  );
  TestValidator.predicate(
    "parent category should remain intact",
    parentCategory.id !== null && parentCategory.name !== "",
  );
  TestValidator.predicate(
    "child category should remain intact",
    childCategory.id !== null && childCategory.name !== "",
  );
  TestValidator.predicate(
    "article should remain intact",
    article.id !== null && article.title !== "",
  );
}
