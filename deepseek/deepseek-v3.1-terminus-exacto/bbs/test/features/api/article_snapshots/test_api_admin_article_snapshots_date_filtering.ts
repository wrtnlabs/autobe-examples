import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
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

export async function test_api_admin_article_snapshots_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Create base article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // Create multiple snapshots with delays to establish timeline
  const snapshots: IDiscussionBoardArticle[] = [];
  // First edit
  const firstEdit = await api.functional.discussionBoard.admin.articles.update(
    adminConnection,
    {
      articleId: article.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(firstEdit);
  snapshots.push(firstEdit);
  // Wait a moment for distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second edit
  const secondEdit = await api.functional.discussionBoard.admin.articles.update(
    adminConnection,
    {
      articleId: article.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(secondEdit);
  snapshots.push(secondEdit);
  // Wait another moment
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Third edit
  const thirdEdit = await api.functional.discussionBoard.admin.articles.update(
    adminConnection,
    {
      articleId: article.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IDiscussionBoardArticle.IUpdate,
    },
  );
  typia.assert(thirdEdit);
  snapshots.push(thirdEdit);
  // Test date filtering with different ranges
  // Test 1: Get all snapshots
  const allSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals("all snapshots count", allSnapshots.data.length, 4); // Includes original creation
  // Test 2: Filter by date range that excludes first snapshot
  const midRangeStart = new Date(
    Date.parse(snapshots[0].created_at) + 50,
  ).toISOString();
  const midRangeEnd = new Date(
    Date.parse(snapshots[2].created_at) - 50,
  ).toISOString();
  const midRangeSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: midRangeStart,
          created_at_end: midRangeEnd,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(midRangeSnapshots);
  TestValidator.equals(
    "mid range snapshots count",
    midRangeSnapshots.data.length,
    1,
  ); // Only secondEdit
  // Test 3: Filter by early date range
  const earlyRangeEnd = new Date(
    Date.parse(snapshots[0].created_at) + 50,
  ).toISOString();
  const earlyRangeSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          created_at_end: earlyRangeEnd,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(earlyRangeSnapshots);
  TestValidator.equals(
    "early range snapshots count",
    earlyRangeSnapshots.data.length,
    2,
  ); // original + firstEdit
  // Test 4: Filter by late date range
  const lateRangeStart = new Date(
    Date.parse(snapshots[2].created_at) - 50,
  ).toISOString();
  const lateRangeSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: lateRangeStart,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(lateRangeSnapshots);
  TestValidator.equals(
    "late range snapshots count",
    lateRangeSnapshots.data.length,
    2,
  ); // secondEdit + thirdEdit
  // Test 5: Empty range filter
  const futureDate = new Date(Date.now() + 10000).toISOString();
  const emptyRangeSnapshots =
    await api.functional.discussionBoard.admin.articles.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: futureDate,
        } satisfies IDiscussionBoardArticleSnapshot.IRequest,
      },
    );
  typia.assert(emptyRangeSnapshots);
  TestValidator.equals(
    "empty range snapshots count",
    emptyRangeSnapshots.data.length,
    0,
  );
}
