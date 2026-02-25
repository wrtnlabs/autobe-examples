import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
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
import { generate_random_discussion_board_admin_articles_favorites_create } from "../../../generate/generate_random_discussion_board_admin_articles_favorites_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_favorite } from "../../../prepare/prepare_random_discussion_board_article_favorite";

export async function test_api_article_favorite_admin_create_new(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Need a valid section ID for article creation
  // Since we cannot create sections in this test, we'll need to use a valid UUID
  // In a real test environment, there would be a default section or setup
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create article using admin connection
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<5> &
          tags.MaxLength<200>,
        content: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
          tags.MinLength<50>,
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create favorite relationship
  const favorite =
    await api.functional.discussionBoard.admin.articles.favorites.create(
      adminConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favorite);
  TestValidator.equals(
    "favorite status should be true",
    favorite.favorited,
    true,
  );
  // 4. Test duplicate favorite (should be handled gracefully)
  await TestValidator.error(
    "duplicate favorite should be handled",
    async () => {
      await api.functional.discussionBoard.admin.articles.favorites.create(
        adminConnection,
        {
          articleId: article.id,
          body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
        },
      );
    },
  );
}
