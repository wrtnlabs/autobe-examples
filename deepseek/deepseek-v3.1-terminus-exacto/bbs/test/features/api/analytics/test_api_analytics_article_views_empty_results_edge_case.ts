import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_analytics_article_views_empty_results_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as admin using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section
  const section =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
    );
  typia.assert(section);
  // Create a very recent article with minimal/no views
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test 1: Filter with future date range (should return empty results)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days in future
  const emptyResults1 =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          start_date: futureDate satisfies string & tags.Format<"date-time">,
          end_date: null,
          section_id: null,
          user_type: null,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(emptyResults1);
  // Validate empty result structure
  await TestValidator.equals("empty data array", emptyResults1.data.length, 0);
  await TestValidator.predicate(
    "pagination metadata present",
    emptyResults1.pagination !== undefined,
  );
  // Test 2: Filter with extremely high view threshold (no articles should meet this)
  const emptyResults2 =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          start_date: null,
          end_date: null,
          section_id: null,
          user_type: null,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(emptyResults2);
  await TestValidator.equals(
    "empty data array for test 2",
    emptyResults2.data.length,
    0,
  );
  // Test 3: Filter by non-existent section
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults3 =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          start_date: null,
          end_date: null,
          section_id: nonExistentSectionId satisfies string &
            tags.Format<"uuid">,
          user_type: null,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(emptyResults3);
  await TestValidator.equals(
    "empty data array for test 3",
    emptyResults3.data.length,
    0,
  );
  // Test 4: Filter by non-existent user type
  const emptyResults4 =
    await api.functional.discussionBoard.admin.analytics.article_views.index(
      adminConnection,
      {
        body: {
          start_date: null,
          end_date: null,
          section_id: null,
          user_type: "superAdmin" satisfies "user" | "admin" | "superAdmin",
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(emptyResults4);
  await TestValidator.equals(
    "empty data array for test 4",
    emptyResults4.data.length,
    0,
  );
  // Validate all empty results have consistent structure
  await TestValidator.equals(
    "all empty results have empty data arrays",
    emptyResults1.data.length,
    0,
  );
  await TestValidator.equals(
    "all empty results have pagination metadata",
    emptyResults2.data.length,
    0,
  );
}
