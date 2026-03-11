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

export async function test_api_attachment_admin_add_multiple_files(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Authenticate as member to create article
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
  // 3. Create article as member using utility function
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // 4. Create multiple file attachments as admin using utility function
  const attachments = await ArrayUtil.asyncRepeat(3, async (index) => {
    const fileTypes = ["pdf", "docx"] as const;
    const fileType = fileTypes[index % fileTypes.length];
    const attachment =
      await generate_random_discussion_board_admin_articles_attachments_create(
        adminConnection,
        {
          params: {
            articleId: article.id,
          },
          body: {
            filename: `test_file_${index + 1}.${fileType}`,
            filetype: fileType,
            mime_type:
              {
                pdf: "application/pdf",
                docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              }[fileType] ?? "application/octet-stream",
            size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          },
        },
      );
    typia.assert(attachment);
    return attachment;
  });
  // 5. Validate all attachments
  TestValidator.equals("attachment count", attachments.length, 3);
  for (const [index, attachment] of attachments.entries()) {
    TestValidator.equals(
      `attachment ${index + 1} article_id matches`,
      attachment.article_id,
      article.id,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has valid ID`,
      attachment.id.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has valid filename`,
      attachment.filename.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has valid filetype`,
      attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has valid mime_type`,
      attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has positive size`,
      attachment.size_bytes > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has valid storage_path`,
      attachment.storage_path.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has valid created_at`,
      attachment.created_at.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} has valid updated_at`,
      attachment.updated_at.length > 0,
    );
  }
}
