import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_files_create } from "../../../generate/generate_random_discussion_board_member_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_multiple_file_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section for article categorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(section);
  // 2. Member setup - register and authenticate
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
  // 3. Create article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Attach first file (PDF document)
  const file1 =
    await generate_random_discussion_board_member_articles_files_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `file_${typia.random<string & tags.Format<"uuid">>()}.pdf`,
          original_name: "document.pdf",
          mime_type: "application/pdf",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
          path: `/storage/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(file1);
  // 5. Attach second file (spreadsheet)
  const file2 =
    await generate_random_discussion_board_member_articles_files_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `file_${typia.random<string & tags.Format<"uuid">>()}.xlsx`,
          original_name: "spreadsheet.xlsx",
          mime_type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
          path: `/storage/files/${typia.random<string & tags.Format<"uuid">>()}.xlsx`,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(file2);
  // 6. Attach third file (text document)
  const file3 =
    await generate_random_discussion_board_member_articles_files_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `file_${typia.random<string & tags.Format<"uuid">>()}.txt`,
          original_name: "notes.txt",
          mime_type: "text/plain",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<100000>
          >(),
          path: `/storage/files/${typia.random<string & tags.Format<"uuid">>()}.txt`,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(file3);
  // 7. Validate all file attachments
  TestValidator.notEquals(
    "file1 and file2 have different IDs",
    file1.id,
    file2.id,
  );
  TestValidator.notEquals(
    "file1 and file3 have different IDs",
    file1.id,
    file3.id,
  );
  TestValidator.notEquals(
    "file2 and file3 have different IDs",
    file2.id,
    file3.id,
  );
  TestValidator.equals(
    "file1 article association",
    file1.article.id,
    article.id,
  );
  TestValidator.equals(
    "file2 article association",
    file2.article.id,
    article.id,
  );
  TestValidator.equals(
    "file3 article association",
    file3.article.id,
    article.id,
  );
  TestValidator.equals(
    "file1 member association",
    file1.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "file2 member association",
    file2.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "file3 member association",
    file3.member.id,
    memberAuth.id,
  );
  TestValidator.notEquals(
    "file1 and file2 have different MIME types",
    file1.mime_type,
    file2.mime_type,
  );
  TestValidator.notEquals(
    "file1 and file3 have different MIME types",
    file1.mime_type,
    file3.mime_type,
  );
  TestValidator.notEquals(
    "file2 and file3 have different MIME types",
    file2.mime_type,
    file3.mime_type,
  );
  TestValidator.notEquals(
    "file1 and file2 have different original names",
    file1.original_name,
    file2.original_name,
  );
  TestValidator.notEquals(
    "file1 and file3 have different original names",
    file1.original_name,
    file3.original_name,
  );
  TestValidator.notEquals(
    "file2 and file3 have different original names",
    file2.original_name,
    file3.original_name,
  );
  TestValidator.predicate("file1 has valid size", file1.size > 0);
  TestValidator.predicate("file2 has valid size", file2.size > 0);
  TestValidator.predicate("file3 has valid size", file3.size > 0);
  TestValidator.predicate(
    "file1 has creation timestamp",
    file1.created_at !== null,
  );
  TestValidator.predicate(
    "file2 has creation timestamp",
    file2.created_at !== null,
  );
  TestValidator.predicate(
    "file3 has creation timestamp",
    file3.created_at !== null,
  );
}
