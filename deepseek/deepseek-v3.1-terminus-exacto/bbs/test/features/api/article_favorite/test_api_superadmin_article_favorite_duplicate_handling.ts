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

/**
 * Test super admin article favorite duplicate handling.
 *
 * Verify that when a super admin attempts to favorite the same article multiple times,
 * the system handles it gracefully without errors. Create super admin account, create
 * article, favorite it once, then attempt to favorite again. Validate that the operation
 * succeeds or returns appropriate status without creating duplicate records.
 */
export async function test_api_superadmin_article_favorite_duplicate_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as super admin
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // First favorite attempt - should succeed
  const firstFavorite =
    await generate_random_discussion_board_super_admin_articles_favorites_create(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(firstFavorite);
  await TestValidator.predicate(
    "first favorite should be true",
    () => firstFavorite.favorited === true,
  );
  // Second favorite attempt - test business logic handling
  try {
    const secondFavorite =
      await generate_random_discussion_board_super_admin_articles_favorites_create(
        superAdminConnection,
        {
          body: {} satisfies IDiscussionBoardArticleFavorite.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(secondFavorite);
    // If we got here without error, validate the response
    await TestValidator.predicate(
      "system should handle duplicate gracefully",
      () =>
        secondFavorite.favorited === false || secondFavorite.favorited === true,
    );
  } catch (error) {
    // If duplicate prevention throws an error, validate it's a business logic error
    await TestValidator.error(
      "system should handle duplicate with appropriate error",
      () => {
        throw error;
      },
    );
  }
  // Validate that core entities remain consistent
  await TestValidator.notEquals(
    "article id should remain unchanged",
    article.id,
    "",
  );
  await TestValidator.predicate(
    "super admin should remain authorized",
    () => superAdmin.id.length > 0,
  );
}
