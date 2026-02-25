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

/**
 * Test superadmin'article favorite status check workflow:
 * 1. Create superadmin account and authenticate
 * 2. Create test article
 * 3. Initially check favorite status should be false
 * 4. Create favorite relationship and verify status becomes true
 * 5. Delete favorite relationship and verify status returns to false
 */
export async function test_api_superadmin_article_favorite_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Superadmin setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create test article
  const article =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.paragraph({ sentences: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Initial favorite status check (should be false)
  const initialFavorite =
    await api.functional.discussionBoard.superAdmin.articles.favorites.own(
      superAdminConnection,
      { articleId: article.id },
    );
  typia.assert(initialFavorite);
  TestValidator.equals(
    "initial favorite status should be false",
    initialFavorite.favorited,
    false,
  );
  // 4. Create favorite relationship and check status becomes true
  const favoriteStatus =
    await api.functional.discussionBoard.superAdmin.articles.favorites.toggle(
      superAdminConnection,
      { articleId: article.id },
    );
  typia.assert(favoriteStatus);
  TestValidator.equals(
    "favorite status after toggle should be true",
    favoriteStatus.favorited,
    true,
  );
  // Verify through own endpoint that status is true
  const afterToggleFavorite =
    await api.functional.discussionBoard.superAdmin.articles.favorites.own(
      superAdminConnection,
      { articleId: article.id },
    );
  typia.assert(afterToggleFavorite);
  TestValidator.equals(
    "favorite status after creation should be true",
    afterToggleFavorite.favorited,
    true,
  );
  // 5. Delete favorite relationship and check status returns to false
  const unfavoriteStatus =
    await api.functional.discussionBoard.superAdmin.articles.favorites.toggle(
      superAdminConnection,
      { articleId: article.id },
    );
  typia.assert(unfavoriteStatus);
  TestValidator.equals(
    "favorite status after second toggle should be false",
    unfavoriteStatus.favorited,
    false,
  );
  // Final verification through own endpoint
  const finalFavorite =
    await api.functional.discussionBoard.superAdmin.articles.favorites.own(
      superAdminConnection,
      { articleId: article.id },
    );
  typia.assert(finalFavorite);
  TestValidator.equals(
    "final favorite status should be false",
    finalFavorite.favorited,
    false,
  );
}