import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_superadmin_upload_files_to_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create an article using a generated section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId: sectionId,
        body: {
          title: "Test Article for File Upload",
          content: RandomGenerator.content({ paragraphs: 5 }),
        },
      },
    );
  typia.assert(article);
  // 3. Upload multiple files to the article
  const file1 =
    await api.functional.discussionBoard.superAdmin.articles.files.create(
      adminConnection,
      { articleId: article.id },
    );
  typia.assert(file1);
  const file2 =
    await api.functional.discussionBoard.superAdmin.articles.files.create(
      adminConnection,
      { articleId: article.id },
    );
  typia.assert(file2);
  const file3 =
    await api.functional.discussionBoard.superAdmin.articles.files.create(
      adminConnection,
      { articleId: article.id },
    );
  typia.assert(file3);
  // 4. Validate file metadata
  TestValidator.predicate(
    "file1 has valid id",
    () => file1.id !== null && file1.id !== undefined,
  );
  TestValidator.predicate(
    "file1 has valid filename",
    () => file1.file_name !== null && file1.file_name !== undefined,
  );
  TestValidator.predicate(
    "file1 has valid file URL",
    () => file1.file_url !== null && file1.file_url !== undefined,
  );
  TestValidator.predicate(
    "file1 has valid file size",
    () => file1.file_size > 0,
  );
  TestValidator.predicate(
    "file1 has valid file type",
    () => file1.file_type !== null && file1.file_type !== undefined,
  );
  TestValidator.predicate(
    "file1 has uploaded_at timestamp",
    () => file1.uploaded_at !== null && file1.uploaded_at !== undefined,
  );
  TestValidator.predicate(
    "file1 has created_at timestamp",
    () => file1.created_at !== null && file1.created_at !== undefined,
  );
  TestValidator.predicate(
    "file1 has updated_at timestamp",
    () => file1.updated_at !== null && file1.updated_at !== undefined,
  );
  TestValidator.equals("file1 deleted_at is null", file1.deleted_at, null);
  // 5. Verify all files are valid
  [file1, file2, file3].forEach((file, index) => {
    TestValidator.predicate(`file${index + 1} has valid structure`, () => {
      return (
        file.id !== null &&
        file.file_name !== null &&
        file.file_url !== null &&
        file.file_size !== null &&
        file.file_type !== null
      );
    });
  });
}
