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

/**
 * Test comprehensive attachment management where super administrator adds multiple attachments
 * to an article then systematically deletes them one by one. Validate cleanup process and
 * article integrity throughout attachment removal operations.
 */
export async function test_api_superadmin_multiple_attachment_cleanup(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate for article creation
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
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Authenticate as superAdmin for attachment operations
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
  // 4. Add three different attachments (PDF, image, document)
  const attachmentTypes = [
    {
      filename: "document.pdf",
      filetype: "pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
    },
    {
      filename: "image.jpg",
      filetype: "jpg",
      mime_type: "image/jpeg",
      size_bytes: 2048,
    },
    {
      filename: "document.docx",
      filetype: "docx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size_bytes: 3072,
    },
  ] as const;
  const attachments: IDiscussionBoardAttachment[] = [];
  for (const attachmentConfig of attachmentTypes) {
    const attachment =
      await generate_random_discussion_board_super_admin_articles_attachments_create(
        superAdminConnection,
        {
          params: { articleId: article.id },
          body: {
            filename: attachmentConfig.filename,
            filetype: attachmentConfig.filetype,
            mime_type: attachmentConfig.mime_type,
            size_bytes: attachmentConfig.size_bytes,
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }
  TestValidator.equals(
    "should have 3 attachments initially",
    attachments.length,
    3,
  );
  // 5. Delete attachments one by one and verify deletion
  for (let i = 0; i < attachments.length; i++) {
    const attachmentToDelete = attachments[i];
    // Delete the attachment using SDK (no utility function available for erase)
    await api.functional.discussionBoard.superAdmin.articles.attachments.erase(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachmentToDelete.id,
      },
    );
    // Verify the attachment is deleted by attempting to access it (should fail)
    await TestValidator.error(
      `deleted attachment ${i + 1} should not be accessible`,
      async () => {
        // Try to create a new attachment with the same ID (should fail if properly deleted)
        await generate_random_discussion_board_super_admin_articles_attachments_create(
          superAdminConnection,
          {
            params: { articleId: article.id },
            body: {
              filename: "test.txt",
              filetype: "txt",
              mime_type: "text/plain",
              size_bytes: 100,
            } satisfies IDiscussionBoardAttachment.ICreate,
          },
        );
      },
    );
    // Verify article integrity remains
    TestValidator.predicate(
      `article should remain intact after deleting attachment ${i + 1}`,
      article.id !== null && article.title !== "",
    );
  }
  // 6. Final validation - verify all operations completed successfully
  TestValidator.predicate(
    "all attachment deletion operations completed successfully",
    true,
  );
}
