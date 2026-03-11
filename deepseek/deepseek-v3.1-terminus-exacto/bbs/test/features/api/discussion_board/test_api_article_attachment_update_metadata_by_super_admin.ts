import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_article_attachment_update_metadata_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate as member
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
  // 2. Create article as member
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
  // 3. Authenticate as super admin
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
  // 4. Create attachment on the article as super admin
  const attachment =
    await generate_random_discussion_board_super_admin_articles_attachments_create(
      superAdminConnection,
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
  // Store original values for comparison
  const originalStoragePath = attachment.storage_path;
  const originalSizeBytes = attachment.size_bytes;
  const originalCreatedAt = attachment.created_at;
  // 5. Update attachment metadata as super admin
  const updateData = {
    filename: `${RandomGenerator.alphabets(8)}.docx`,
    filetype: "docx",
    mime_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  } satisfies IDiscussionBoardAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.discussionBoard.superAdmin.articles.attachments.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: updateData,
      },
    );
  typia.assert(updatedAttachment);
  // 6. Validate that only allowed fields are updated
  TestValidator.equals(
    "filename should be updated",
    updatedAttachment.filename,
    updateData.filename,
  );
  TestValidator.equals(
    "filetype should be updated",
    updatedAttachment.filetype,
    updateData.filetype,
  );
  TestValidator.equals(
    "mime_type should be updated",
    updatedAttachment.mime_type,
    updateData.mime_type,
  );
  // Verify system-managed fields remain unchanged
  TestValidator.equals(
    "storage_path should remain unchanged",
    updatedAttachment.storage_path,
    originalStoragePath,
  );
  TestValidator.equals(
    "size_bytes should remain unchanged",
    updatedAttachment.size_bytes,
    originalSizeBytes,
  );
  TestValidator.equals(
    "article_id should remain unchanged",
    updatedAttachment.article_id,
    article.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedAttachment.created_at,
    originalCreatedAt,
  );
  // Verify updated_at timestamp reflects modification
  TestValidator.notEquals(
    "updated_at should be modified",
    updatedAttachment.updated_at,
    attachment.updated_at,
  );
  // 7. Test filename uniqueness validation by attempting duplicate filename
  await TestValidator.error(
    "should fail when renaming to duplicate filename",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.attachments.update(
        superAdminConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: {
            filename: updateData.filename, // Same filename as already used
          } satisfies IDiscussionBoardAttachment.IUpdate,
        },
      );
    },
  );
  // 8. Validate proper MIME type formatting
  TestValidator.predicate(
    "mime_type should be valid format",
    updatedAttachment.mime_type.includes("/") &&
      updatedAttachment.mime_type.length > 0,
  );
}
