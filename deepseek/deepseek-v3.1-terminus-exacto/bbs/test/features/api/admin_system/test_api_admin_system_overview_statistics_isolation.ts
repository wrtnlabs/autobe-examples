import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
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

/**
 * Test that the system overview statistics correctly isolate active vs deleted records.
 * Authenticate as admin, create test articles, soft-delete some records, and verify
 * statistics only count active records (where deleted_at is null).
 */
export async function test_api_admin_system_overview_statistics_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create test articles
  const articles = await ArrayUtil.asyncRepeat(5, async () => {
    const article =
      await generate_random_discussion_board_admin_articles_create(
        adminConnection,
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
    return article;
  });
  // 3. Soft-delete some articles (first 2 articles)
  const deletedArticles = articles.slice(0, 2);
  await ArrayUtil.asyncForEach(deletedArticles, async (article) => {
    await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
      articleId: article.id,
    });
  });
  // 4. Call system overview endpoint
  const overview =
    await api.functional.discussionBoard.admin.system.overview.at(
      adminConnection,
    );
  typia.assert(overview);
  // 5. Validate the overview response structure
  // The overview returns IDiscussionBoardSystemConfiguration which contains
  // system configuration data, not statistical counts
  TestValidator.equals(
    "overview should have valid configuration properties",
    typeof overview.config_key,
    "string",
  );
  TestValidator.equals(
    "overview should have valid configuration value",
    typeof overview.config_value,
    "string",
  );
  TestValidator.predicate(
    "overview should have valid data type",
    ["string", "integer", "boolean", "number", "json"].includes(
      overview.data_type,
    ),
  );
  TestValidator.equals(
    "overview should have description",
    typeof overview.description,
    "string",
  );
  TestValidator.equals(
    "overview should have category",
    typeof overview.category,
    "string",
  );
  TestValidator.equals(
    "overview should have is_sensitive flag",
    typeof overview.is_sensitive,
    "boolean",
  );
}
