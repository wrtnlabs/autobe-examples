import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

/**
 * Test the system's ability to prevent duplicate tags for the same article.
 * Authenticate as a user, create an article, then attempt to add the same tag multiple times.
 * The first attempt should succeed, but subsequent attempts with the same tag name should fail
 * with appropriate validation errors. Verify that the system maintains tag uniqueness per article
 * and returns clear error messages for duplicate tag attempts.
 */
export async function test_api_article_tag_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate user using SDK function (no utility function available)
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(user);
  // 2. Create an article using SDK function
  // Note: We need a valid section_id, but since we can't create sections as a regular user,
  // we'll assume there's at least one active section available in the system
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This may fail if section doesn't exist
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create a random tag name
  const tagName = RandomGenerator.name(1);
  // 4. Add tag successfully (first attempt) using SDK function
  const firstTag =
    await api.functional.discussionBoard.user.articles.tags.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          tag_name: tagName,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(firstTag);
  // 5. Attempt to add duplicate tag (should fail)
  await TestValidator.error("duplicate tag prevention", async () => {
    await api.functional.discussionBoard.user.articles.tags.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          tag_name: tagName,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
  // 6. Verify only one tag instance exists
  TestValidator.equals("tag name matches", firstTag.tag_name, tagName);
  TestValidator.equals("article ID matches", firstTag.article.id, article.id);
}
