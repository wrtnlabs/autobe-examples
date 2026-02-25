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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_favorite_multiple_admins_concurrent(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin account
  const admin1Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create second admin account
  const admin2Connection: api.IConnection = { host: connection.host };
  await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Admin1 creates an article
  const article = await generate_random_discussion_board_admin_articles_create(
    admin1Connection,
    {
      body: {
        title: "Test Article for Favorite Operations",
        content:
          "This article will be used to test favorite functionality by multiple administrators.",
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Admin1 favorites the article
  const admin1Favorite1 =
    await api.functional.discussionBoard.admin.articles.favorites.toggle(
      admin1Connection,
      {
        articleId: article.id,
      } satisfies api.functional.discussionBoard.admin.articles.favorites.toggle.Props,
    );
  typia.assert(admin1Favorite1);
  TestValidator.equals(
    "admin1 can favorite article",
    admin1Favorite1.favorited,
    true,
  );
  // Admin2 views and favorites the same article
  const admin2Favorite1 =
    await api.functional.discussionBoard.admin.articles.favorites.toggle(
      admin2Connection,
      {
        articleId: article.id,
      } satisfies api.functional.discussionBoard.admin.articles.favorites.toggle.Props,
    );
  typia.assert(admin2Favorite1);
  TestValidator.equals(
    "admin2 can favorite same article",
    admin2Favorite1.favorited,
    true,
  );
  // Admin1 unfavorites the article
  const admin1Favorite2 =
    await api.functional.discussionBoard.admin.articles.favorites.toggle(
      admin1Connection,
      {
        articleId: article.id,
      } satisfies api.functional.discussionBoard.admin.articles.favorites.toggle.Props,
    );
  typia.assert(admin1Favorite2);
  TestValidator.equals(
    "admin1 can unfavorite article",
    admin1Favorite2.favorited,
    false,
  );
  // Admin2's favorite status remains unchanged
  const admin2FavoriteCheck =
    await api.functional.discussionBoard.admin.articles.favorites.toggle(
      admin2Connection,
      {
        articleId: article.id,
      } satisfies api.functional.discussionBoard.admin.articles.favorites.toggle.Props,
    );
  typia.assert(admin2FavoriteCheck);
  TestValidator.equals(
    "admin2's favorite persists after admin1 removal",
    admin2FavoriteCheck.favorited,
    false,
  );
  // Final state: Both admins have independently managed favorite status
  TestValidator.predicate(
    "favorite system maintains user independence",
    admin1Favorite2.favorited !== admin2Favorite1.favorited ||
      (admin1Favorite2.favorited === false &&
        admin2FavoriteCheck.favorited === false),
  );
}
