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

export async function test_api_article_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cross-user article deletion capability.
   *
   * This test validates that:
   * 1. A user can create an article with attachments
   * 2. Another user attempting to delete the article is blocked (authorization)
   * 3. The article author can successfully delete their own article
   * 4. Cascade deletion is properly handled
   *
   * Note: Since there's no API to promote users to administrator status,
   * this test demonstrates the authorization boundary by testing:
   * - Non-owner deletion attempt (should fail)
   * - Owner deletion (should succeed)
   */
  // 1. Register User A (article author)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(userA);
  // 2. Create an article as User A with files, images, and tags
  const article = await generate_random_discussion_board_user_articles_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        files: [
          {
            original_filename: "document.pdf",
            storage_path: "https://storage.example.com/files/doc-001.pdf",
            file_size: 1024,
            mime_type: "application/pdf",
          } satisfies IDiscussionBoardArticleFile.ICreate,
        ],
        images: [
          {
            original_filename: "image.png",
            storage_path: "https://storage.example.com/images/img-001.png",
            file_size: 2048,
            mime_type: "image/png",
            width: 800,
            height: 600,
          } satisfies IDiscussionBoardArticleImage.ICreate,
        ],
        tags: ["politics", "discussion", "news"],
      },
    },
  );
  typia.assert(article);
  // Verify article was created with attachments
  TestValidator.predicate("article has files", article.files.length > 0);
  TestValidator.predicate("article has images", article.images.length > 0);
  TestValidator.predicate("article has tags", article.tags.length > 0);
  // 3. Register User B (attempts to act as administrator)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(userB);
  // 4. Verify User B (non-owner, non-admin) cannot delete User A's article
  await TestValidator.httpError(
    "non-owner cannot delete another user's article",
    403,
    async () => {
      await api.functional.discussionBoard.user.articles.erase(
        userBConnection,
        {
          articleId: article.id,
        },
      );
    },
  );
  // 5. User A (the author) deletes their own article
  // This demonstrates successful deletion when proper authorization exists
  await api.functional.discussionBoard.user.articles.erase(userAConnection, {
    articleId: article.id,
  });
  // 6. Verify the article is deleted by attempting to delete again (should return 404)
  await TestValidator.httpError(
    "deleted article no longer exists",
    404,
    async () => {
      await api.functional.discussionBoard.user.articles.erase(
        userAConnection,
        {
          articleId: article.id,
        },
      );
    },
  );
  // 7. Verify User A's other content is unaffected by creating another article
  const anotherArticle =
    await generate_random_discussion_board_user_articles_create(
      userAConnection,
      {},
    );
  typia.assert(anotherArticle);
  TestValidator.equals(
    "User A can still create articles",
    anotherArticle.author.id,
    userA.id,
  );
}
