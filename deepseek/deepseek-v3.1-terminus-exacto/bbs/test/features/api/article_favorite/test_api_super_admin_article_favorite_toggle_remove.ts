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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_super_admin_article_favorite_toggle_remove(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create an article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(article);
  // Add article as favorite (first toggle)
  const favoriteResponse1: IDiscussionBoardArticleFavorite.IStatus =
    await api.functional.discussionBoard.superAdmin.articles.favorites.toggle(
      superAdminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(favoriteResponse1);
  TestValidator.predicate(
    "first toggle should add favorite",
    favoriteResponse1.favorited,
  );
  // Remove article from favorites (second toggle)
  const favoriteResponse2: IDiscussionBoardArticleFavorite.IStatus =
    await api.functional.discussionBoard.superAdmin.articles.favorites.toggle(
      superAdminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(favoriteResponse2);
  TestValidator.predicate(
    "second toggle should remove favorite",
    !favoriteResponse2.favorited,
  );
  // Validate that favorite status changed from true to false
  TestValidator.notEquals(
    "favorite status should change",
    favoriteResponse1.favorited,
    favoriteResponse2.favorited,
  );
}
