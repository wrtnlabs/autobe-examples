import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
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
 * Test article view statistics with varying engagement patterns.
 * 1. Authenticate as superAdmin
 * 2. Create an article
 * 3. Retrieve initial view statistics (should be zero/default)
 * 4. Validate statistics calculations across different viewing patterns
 */
export async function test_api_article_view_stats_varying_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
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
  // 2. Create an article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Retrieve initial view statistics
  const initialStats =
    await api.functional.discussionBoard.superAdmin.articles.view_stats.at(
      superAdminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(initialStats);
  // 4. Validate initial statistics
  TestValidator.equals(
    "initial total views should be 0",
    initialStats.total_view_count,
    0,
  );
  TestValidator.equals(
    "initial unique viewers should be 0",
    initialStats.unique_viewer_count,
    0,
  );
  TestValidator.equals(
    "initial total time spent should be 0",
    initialStats.total_time_spent_seconds,
    0,
  );
  TestValidator.equals(
    "initial average time should be null",
    initialStats.average_time_spent_seconds,
    null,
  );
  TestValidator.equals(
    "initial last viewed should be null",
    initialStats.last_viewed_at,
    null,
  );
  // NOTE: Actual view simulation with varying engagement patterns would require
  // additional API endpoints for recording view events, which are not provided
  // in the current API specification. The current implementation tests the
  // basic functionality of the view statistics endpoint with zero views.
}
