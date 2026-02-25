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
 * Test that an article author can successfully delete their own article,
 * triggering complete cascade deletion of all related entities.
 */
export async function test_api_article_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create an article with optional attachments to verify cascade deletion
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        files: [
          {
            original_filename: "document.pdf",
            storage_path: "file://uploads/document.pdf",
            file_size: 1024,
            mime_type: "application/pdf",
          } satisfies IDiscussionBoardArticleFile.ICreate,
        ],
        images: [
          {
            original_filename: "image.png",
            storage_path: "file://uploads/image.png",
            file_size: 2048,
            mime_type: "image/png",
            width: 800,
            height: 600,
          } satisfies IDiscussionBoardArticleImage.ICreate,
        ],
        tags: ["cascade-test", "deletion-verification"],
      },
    },
  );
  typia.assert(article);
  // 3. Delete the article using the author's authentication
  await api.functional.discussionBoard.user.articles.erase(userConnection, {
    articleId: article.id,
  });
  // 4. Verify cascade deletion - attempting to delete non-existent article returns 404
  await TestValidator.httpError("deleted article should return 404", 404, () =>
    api.functional.discussionBoard.user.articles.erase(userConnection, {
      articleId: article.id,
    }),
  );
}
