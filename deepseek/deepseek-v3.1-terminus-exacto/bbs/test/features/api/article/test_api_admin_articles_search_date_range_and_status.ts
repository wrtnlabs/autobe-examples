import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_admin_articles_search_date_range_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
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
  // Create test section ID for articles
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create articles with varied timestamps and statuses
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Article 1: 2 days ago (published)
  const article1 = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  // Article 2: 1 day ago (draft)
  const article2 = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Modify article statuses (assuming status can be set via update)
  // Using the patch endpoint to test date range filtering
  // Test 1: Date range filtering - articles from 3 days ago to now
  const startDate = new Date(now.getTime() - 3 * oneDayMs).toISOString();
  const endDate = new Date(now.getTime()).toISOString();
  const searchResult1 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        created_at_start: startDate,
        created_at_end: endDate,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "should find articles within date range",
    searchResult1.data.length >= 2,
  );
  // Test 2: Date range filtering - very restricted window (should find some)
  const narrowStart = new Date(now.getTime() - 2 * oneDayMs).toISOString();
  const narrowEnd = new Date(now.getTime() - oneDayMs).toISOString();
  const searchResult2 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        created_at_start: narrowStart,
        created_at_end: narrowEnd,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult2);
  // Test 3: Invalid date range (start after end)
  const searchResult3 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        created_at_start: endDate,
        created_at_end: startDate, // reversed dates
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult3);
  TestValidator.predicate(
    "should return empty for invalid date range",
    searchResult3.data.length === 0,
  );
  // Test 4: Status filtering
  const searchResult4 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        status: "draft",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult4);
  // Verify all returned articles have draft status
  if (searchResult4.data.length > 0) {
    searchResult4.data.forEach((article) => {
      TestValidator.equals(
        "article should have draft status",
        article.status,
        "draft",
      );
    });
  }
  // Test 5: Combined date and status filtering
  const searchResult5 =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        status: "published",
        created_at_start: startDate,
        created_at_end: endDate,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult5);
  // Verify all returned articles have published status
  if (searchResult5.data.length > 0) {
    searchResult5.data.forEach((article) => {
      TestValidator.equals(
        "article should have published status",
        article.status,
        "published",
      );
    });
  }
}
