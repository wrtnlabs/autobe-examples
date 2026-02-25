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

export async function test_api_article_view_stats_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create article for testing view statistics
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(article);
  // 3. Retrieve view statistics for the article
  const viewStats =
    await api.functional.discussionBoard.superAdmin.articles.view_stats.at(
      superAdminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(viewStats);
  // 4. Validate comprehensive statistics data
  TestValidator.equals("view stats has ID", typeof viewStats.id, "string");
  TestValidator.predicate(
    "total view count is non-negative",
    viewStats.total_view_count >= 0,
  );
  TestValidator.predicate(
    "unique viewer count is non-negative",
    viewStats.unique_viewer_count >= 0,
  );
  TestValidator.predicate(
    "total time spent is non-negative",
    viewStats.total_time_spent_seconds >= 0,
  );
  // Validate timestamp formats if present
  if (
    viewStats.last_viewed_at !== null &&
    viewStats.last_viewed_at !== undefined
  ) {
    TestValidator.predicate("last viewed at is valid timestamp", () => {
      try {
        new Date(viewStats.last_viewed_at!);
        return true;
      } catch {
        return false;
      }
    });
  }
  TestValidator.predicate("created at is valid timestamp", () => {
    try {
      new Date(viewStats.created_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("updated at is valid timestamp", () => {
    try {
      new Date(viewStats.updated_at);
      return true;
    } catch {
      return false;
    }
  });
  // Validate relationship between counts
  TestValidator.predicate(
    "unique viewer count <= total view count",
    viewStats.unique_viewer_count <= viewStats.total_view_count,
  );
}
