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

/**
 * Test the successful addition of file attachments to an article by its author.
 *
 * 1. User registers and authenticates
 * 2. User creates an article
 * 3. Add file attachment via PATCH endpoint
 * 4. Validate response contains file summary with correct metadata
 */
export async function test_api_article_files_add_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication - create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create article for file attachment testing
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Prepare file metadata with allowed MIME type (PDF)
  const testFile = {
    original_filename: "document.pdf",
    storage_path: typia.random<string & tags.Format<"uri">>(),
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    mime_type: "application/pdf",
  } satisfies IDiscussionBoardArticleFile.ICreate;
  // 4. Add file to article via PATCH endpoint
  const response =
    await api.functional.discussionBoard.articles.files.updateFiles(
      userConnection,
      {
        articleId: article.id,
        body: {
          original_filename: testFile.original_filename,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(response);
  // 5. Validate response - file summary returned
  TestValidator.equals(
    "filename matches",
    response.original_filename,
    testFile.original_filename,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(response.created_at),
  );
}
