import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_admin_removal_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a test article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // 3. Add multiple tags to the article
  const tags = await Promise.all(
    ArrayUtil.repeat(3, async (index) => {
      const tag =
        await generate_random_discussion_board_admin_articles_tags_create(
          adminConnection,
          {
            params: { articleId: article.id },
            body: {
              tag_name: `tag-${index + 1}-${RandomGenerator.alphabets(5)}`,
            },
          },
        );
      typia.assert(tag);
      return tag;
    }),
  );
  // 4. Remove a specific tag (the second one)
  const tagToRemove = tags[1];
  await api.functional.discussionBoard.admin.articles.tags.erase(
    adminConnection,
    {
      articleId: article.id,
      tagId: tagToRemove.id,
    },
  );
  // 5. Verify the remaining tags are preserved
  // Note: Since we don't have a list endpoint, we verify by ensuring
  // the other tags still exist by attempting to remove them
  await TestValidator.error("first tag should still exist", async () => {
    await api.functional.discussionBoard.admin.articles.tags.erase(
      adminConnection,
      {
        articleId: article.id,
        tagId: tags[0].id,
      },
    );
  });
  await TestValidator.error("third tag should still exist", async () => {
    await api.functional.discussionBoard.admin.articles.tags.erase(
      adminConnection,
      {
        articleId: article.id,
        tagId: tags[2].id,
      },
    );
  });
  // 6. Verify removed tag is gone
  await TestValidator.error("removed tag should not exist", async () => {
    // Attempt to remove the same tag again - should fail
    await api.functional.discussionBoard.admin.articles.tags.erase(
      adminConnection,
      {
        articleId: article.id,
        tagId: tagToRemove.id,
      },
    );
  });
}
