import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_article_attachments_member_adds_files(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as member using join endpoint
  const authorizedMember = await authorize_member_join(memberConnection, {
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
  typia.assert(authorizedMember);
  // Update member connection with authorization token
  memberConnection.headers = { Authorization: authorizedMember.token.access };
  // 2. Create article to attach files to
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
  // 3. Create multiple file attachments for the article
  const attachments = await ArrayUtil.asyncRepeat(2, async (index) => {
    const fileTypes = ["pdf", "jpg"] as const;
    const mimeTypes = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
    } as const;
    const filetype = fileTypes[index];
    const filename = `test_file_${index + 1}.${filetype}`;
    const attachment =
      await generate_random_discussion_board_member_articles_attachments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            filename,
            filetype,
            mime_type: mimeTypes[filetype],
            size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    return attachment;
  });
  // 4. Validate attachment metadata
  TestValidator.equals(
    "should create exactly 2 attachments",
    attachments.length,
    2,
  );
  attachments.forEach((attachment, index) => {
    TestValidator.equals(
      `attachment ${index + 1} should have correct article_id`,
      attachment.article_id,
      article.id,
    );
    TestValidator.predicate(
      `attachment ${index + 1} should have non-empty filename`,
      attachment.filename.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} should have non-empty filetype`,
      attachment.filetype.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} should have non-empty mime_type`,
      attachment.mime_type.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} should have positive size_bytes`,
      attachment.size_bytes > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} should have non-empty storage_path`,
      attachment.storage_path.length > 0,
    );
    TestValidator.predicate(
      `attachment ${index + 1} should have valid created_at timestamp`,
      attachment.created_at.length > 0 &&
        !isNaN(Date.parse(attachment.created_at)),
    );
    TestValidator.predicate(
      `attachment ${index + 1} should have valid updated_at timestamp`,
      attachment.updated_at.length > 0 &&
        !isNaN(Date.parse(attachment.updated_at)),
    );
  });
  // 5. Verify different file types were created
  const filetypes = attachments.map((a) => a.filetype);
  TestValidator.notEquals(
    "attachments should have different file types",
    filetypes[0],
    filetypes[1],
  );
  // 6. Verify specific file types match our expectations
  TestValidator.predicate(
    "first attachment should be PDF",
    attachments[0].filetype === "pdf" &&
      attachments[0].mime_type === "application/pdf",
  );
  TestValidator.predicate(
    "second attachment should be JPG",
    attachments[1].filetype === "jpg" &&
      attachments[1].mime_type === "image/jpeg",
  );
}
