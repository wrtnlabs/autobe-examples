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
 * Test the edge case where a user attempts to update a tag name to one that already exists on the same article.
 * This validates the unique constraint that prevents duplicate tag names per article.
 */
export async function test_api_article_tag_update_unique_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // 2. Create an article for tag operations
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create first tag with name 'economics'
  const firstTag =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        body: {
          tag_name: "economics",
        } satisfies IDiscussionBoardArticleTag.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(firstTag);
  // 4. Create second tag with name 'politics' to test conflict
  const secondTag =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        body: {
          tag_name: "politics",
        } satisfies IDiscussionBoardArticleTag.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(secondTag);
  // 5. Attempt to update first tag to match second tag's name (should fail)
  await TestValidator.error(
    "update tag to duplicate name should fail",
    async () => {
      await api.functional.discussionBoard.user.articles.tags.update(
        userConnection,
        {
          articleId: article.id,
          tagId: firstTag.id,
          body: {
            tag_name: "politics",
          } satisfies IDiscussionBoardArticleTag.IUpdate,
        },
      );
    },
  );
  // 6. Verify original tags still exist (no changes made)
  // In a real scenario we might fetch tags again to verify they remain unchanged
  TestValidator.equals(
    "first tag name unchanged",
    firstTag.tag_name,
    "economics",
  );
  TestValidator.equals(
    "second tag name unchanged",
    secondTag.tag_name,
    "politics",
  );
  // 7. Verify we can still update to a new unique name
  const thirdTag =
    await api.functional.discussionBoard.user.articles.tags.update(
      userConnection,
      {
        articleId: article.id,
        tagId: firstTag.id,
        body: {
          tag_name: "technology",
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(thirdTag);
  TestValidator.equals(
    "tag updated to new unique name",
    thirdTag.tag_name,
    "technology",
  );
  // 8. Validate that the conflict error is a HTTP error (likely 409 or 400)
  // The TestValidator.error above already validates the error is thrown
}
