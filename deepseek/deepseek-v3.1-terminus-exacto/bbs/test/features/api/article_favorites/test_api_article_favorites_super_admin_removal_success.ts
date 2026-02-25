import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFavorite";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_favorites_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_favorites_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_favorite } from "../../../prepare/prepare_random_discussion_board_article_favorite";

export async function test_api_article_favorites_super_admin_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Update connection with authentication token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdmin.token.access,
  };
  // Step 2: Create an article to favorite
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string as string &
            tags.MinLength<5> &
            tags.MaxLength<200>,
          content: RandomGenerator.paragraph({
            sentences: 5,
          }) satisfies string as string & tags.MinLength<50>,
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(article);
  // Step 3: Add article to favorites
  const favorite =
    await generate_random_discussion_board_super_admin_articles_favorites_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favorite);
  TestValidator.equals("article favorited", favorite.favorited, true);
  // Step 4: Remove article from favorites
  await api.functional.discussionBoard.superAdmin.articles.favorites.erase(
    superAdminConnection,
    {
      articleId: article.id,
    },
  );
  // Step 5: Verify favorite status is now false
  const favoriteStatus =
    await api.functional.discussionBoard.superAdmin.articles.favorites.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favoriteStatus);
  TestValidator.equals("article unfavorited", favoriteStatus.favorited, false);
}
