import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_admin_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test successful attachment metadata update by administrator.
 *
 * This test validates that an administrator can update attachment metadata
 * (filename, filetype, mime_type) for any article, regardless of ownership.
 * The test creates a member account to own the article, then uses admin
 * privileges to add and update attachment metadata while preserving
 * system-managed fields like storage_path and size_bytes.
 */
export async function test_api_admin_article_attachment_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate as regular member
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
  typia.assert(memberAuth);
  // 2. Create admin connection and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 3. Create article as member - using a valid section ID
  // Note: In a real scenario, we would need to create a section first
  // For this test, we'll use a valid UUID format
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // 4. Create attachment as administrator
  const initialAttachment =
    await generate_random_discussion_board_admin_articles_attachments_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: RandomGenerator.alphabets(10) + ".txt",
          filetype: "txt",
          mime_type: "text/plain",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(initialAttachment);
  // 5. Update attachment metadata as administrator
  const updateData: IDiscussionBoardAttachment.IUpdate = {
    filename: RandomGenerator.alphabets(8) + ".pdf",
    filetype: "pdf",
    mime_type: "application/pdf",
  };
  const updatedAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.update(
      adminConnection,
      {
        articleId: article.id,
        attachmentId: initialAttachment.id,
        body: updateData,
      },
    );
  typia.assert(updatedAttachment);
  // 6. Validate metadata updates
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
  // 7. Validate system-managed fields remain unchanged
  TestValidator.equals(
    "storage_path should remain unchanged",
    updatedAttachment.storage_path,
    initialAttachment.storage_path,
  );
  TestValidator.equals(
    "size_bytes should remain unchanged",
    updatedAttachment.size_bytes,
    initialAttachment.size_bytes,
  );
  TestValidator.equals(
    "article_id should remain unchanged",
    updatedAttachment.article_id,
    initialAttachment.article_id,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "created_at should remain unchanged",
    updatedAttachment.created_at === initialAttachment.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be newer",
    updatedAttachment.updated_at,
    initialAttachment.updated_at,
  );
  // 9. Test filename uniqueness constraint
  // Try to create another attachment with the same filename as the updated one
  await TestValidator.error(
    "should reject duplicate filename within same article",
    async () => {
      await generate_random_discussion_board_admin_articles_attachments_create(
        adminConnection,
        {
          params: { articleId: article.id },
          body: {
            filename: updateData.filename!, // Use the same filename
            filetype: "jpg",
            mime_type: "image/jpeg",
            size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          },
        },
      );
    },
  );
}
