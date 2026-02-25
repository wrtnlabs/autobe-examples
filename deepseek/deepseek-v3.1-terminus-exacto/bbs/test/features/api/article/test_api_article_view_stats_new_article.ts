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

export async function test_api_article_view_stats_new_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a fresh article using generation function (let it generate random data)
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {} as any,
    );
  typia.assert(article);
  // 3. Retrieve view stats for the newly created article (no views yet)
  const stats =
    await api.functional.discussionBoard.superAdmin.articles.view_stats.at(
      superAdminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(stats);
  // 4. Validate zero view counts for fresh article (business logic validation)
  TestValidator.equals(
    "total view count should be zero",
    stats.total_view_count,
    0,
  );
  TestValidator.equals(
    "unique viewer count should be zero",
    stats.unique_viewer_count,
    0,
  );
  TestValidator.equals(
    "total time spent should be zero",
    stats.total_time_spent_seconds,
    0,
  );
  TestValidator.predicate(
    "average time spent should be null",
    stats.average_time_spent_seconds === null,
  );
  TestValidator.predicate(
    "last viewed at should be null",
    stats.last_viewed_at === null,
  );
  // 5. typia.assert() already validated timestamp formats are correct via DTO definitions
  // No need for redundant checks after typia.assert()
}
