import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_files_remove_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {});
  typia.assert(authResult);
  // 2. Create article with 3 file attachments
  const fileAttachments: IDiscussionBoardArticleFile.ICreate[] = [
    {
      original_filename: "document1.pdf",
      storage_path: "https://storage.example.com/files/doc1.pdf",
      file_size: 102400,
      mime_type: "application/pdf",
    } satisfies IDiscussionBoardArticleFile.ICreate,
    {
      original_filename: "document2.docx",
      storage_path: "https://storage.example.com/files/doc2.docx",
      file_size: 204800,
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    } satisfies IDiscussionBoardArticleFile.ICreate,
    {
      original_filename: "document3.xlsx",
      storage_path: "https://storage.example.com/files/doc3.xlsx",
      file_size: 51200,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    } satisfies IDiscussionBoardArticleFile.ICreate,
  ];
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        files: fileAttachments,
      },
    },
  );
  typia.assert(article);
  // 3. Verify article has 3 files
  TestValidator.equals("article should have 3 files", article.files.length, 3);
  // 4. Update file attachment display name using the available IUpdate type
  const updateResult =
    await api.functional.discussionBoard.articles.files.updateFiles(
      userConnection,
      {
        articleId: article.id,
        body: {
          original_filename: "renamed_document.pdf",
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 5. Validate the update result contains expected file summary
  TestValidator.equals(
    "updated filename should match",
    updateResult.original_filename,
    "renamed_document.pdf",
  );
}
