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

export async function test_api_article_favorite_status_check_favorited(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create article (need section ID first, but section creation not in available utils)
  // Since no section generation utility available, we'll use a random UUID for section ID
  // This assumes a valid section exists - in real scenario we would create section first
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.paragraph({ sentences: 5 }),
    discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: articleBody,
    },
  );
  typia.assert(article);
  // 3. Mark article as favorited
  const favorite =
    await api.functional.discussionBoard.admin.articles.favorites.create(
      adminConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
      },
    );
  typia.assert(favorite);
  // 4. Check favorite status
  const status =
    await api.functional.discussionBoard.admin.articles.favorites.own(
      adminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(status);
  // 5. Validate status is true (favorited)
  TestValidator.equals(
    "favorite status should be true",
    status.favorited,
    true,
  );
}
