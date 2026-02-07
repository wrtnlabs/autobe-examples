import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
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

export async function test_api_article_file_attachments_empty_article(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article without file attachments
  // Note: section_id must be a valid UUID that exists in the database
  // This test assumes a valid section exists or will be created separately
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test file listing endpoint with pagination
  const fileList = await api.functional.discussionBoard.articles.files.index(
    userConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(fileList);
  // Verify empty data array and correct pagination metadata
  TestValidator.equals("data array should be empty", fileList.data.length, 0);
  TestValidator.equals("records should be 0", fileList.pagination.records, 0);
  TestValidator.equals("pages should be 0", fileList.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    fileList.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", fileList.pagination.limit, 10);
  // Test filtering on empty article
  const filteredFileList =
    await api.functional.discussionBoard.articles.files.index(userConnection, {
      articleId: article.id,
      body: {
        search: "test",
        file_type: "image/jpeg",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(filteredFileList);
  // Verify filtering still returns empty results
  TestValidator.equals(
    "filtered data array should be empty",
    filteredFileList.data.length,
    0,
  );
  TestValidator.equals(
    "filtered records should be 0",
    filteredFileList.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered pages should be 0",
    filteredFileList.pagination.pages,
    0,
  );
}
