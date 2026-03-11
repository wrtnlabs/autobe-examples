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

export async function test_api_attachment_admin_concurrent_uploads(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register
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
  // Create admin connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create article as member using SDK function directly
  const article = await api.functional.discussionBoard.member.articles.create(
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
  // Create multiple attachment upload promises with different file types
  const attachmentPromises = ArrayUtil.repeat(3, (index) => {
    const fileTypes = ["txt", "pdf", "jpg"] as const;
    const mimeTypes = {
      txt: "text/plain",
      pdf: "application/pdf",
      jpg: "image/jpeg",
    } as const;
    const fileType = fileTypes[index % fileTypes.length];
    return api.functional.discussionBoard.admin.articles.attachments.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          filename: `concurrent-file-${index}.${fileType}`,
          filetype: fileType,
          mime_type: mimeTypes[fileType],
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  });
  // Execute concurrent uploads using Promise.all to simulate parallel operations
  const attachments = await Promise.all(attachmentPromises);
  // Validate each attachment was created successfully
  attachments.forEach((attachment) => {
    typia.assert(attachment);
    TestValidator.equals(
      "attachment article ID matches",
      attachment.article_id,
      article.id,
    );
    TestValidator.predicate(
      "attachment has valid size",
      attachment.size_bytes > 0,
    );
    TestValidator.predicate(
      "attachment has creation timestamp",
      attachment.created_at && new Date(attachment.created_at).getTime() > 0,
    );
  });
  // Validate unique storage paths were generated
  const storagePaths = attachments.map((att) => att.storage_path);
  const uniquePaths = new Set(storagePaths);
  TestValidator.equals(
    "all storage paths are unique",
    uniquePaths.size,
    attachments.length,
  );
  // Validate that each attachment has independent metadata
  attachments.forEach((attachment, index) => {
    const expectedExtensions = ["txt", "pdf", "jpg"];
    const expectedExtension =
      expectedExtensions[index % expectedExtensions.length];
    TestValidator.predicate(
      "filename contains correct extension",
      attachment.filename.endsWith(`.${expectedExtension}`),
    );
    TestValidator.equals(
      "filetype matches expected",
      attachment.filetype,
      expectedExtension,
    );
  });
  // Test that valid attachments succeed even if one would fail (simulate by testing individually)
  const validAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          filename: "valid-file.docx",
          filetype: "docx",
          mime_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(validAttachment);
  TestValidator.equals(
    "valid attachment created successfully",
    validAttachment.article_id,
    article.id,
  );
}
