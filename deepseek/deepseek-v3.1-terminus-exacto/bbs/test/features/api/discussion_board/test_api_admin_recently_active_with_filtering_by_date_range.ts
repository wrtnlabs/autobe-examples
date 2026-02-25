import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test filtering recently active articles by creation date range and other search criteria.
 * Admin authentication needed. Setup sections, articles, and comments as in first scenario.
 * Use request body filtering: created_at_start and created_at_end to narrow to specific time window.
 * Test pagination with different limit values. Validate returned articles respect date boundaries.
 * Also test filtering by article title (partial match), section ID, status='published'.
 * Expect draft/archived articles excluded. Edge case: articles with no comments in date range
 * should still appear if creation date within range.
 */
export async function test_api_admin_recently_active_with_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create sections
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // Create articles - they will have current timestamps
  const article1 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section1.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title:
          "Test Article with Specific Title" + RandomGenerator.alphabets(5),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section1.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  const article3 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section2.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);
  // Create and authenticate user for comments
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  await authorize_user_join(userJoinConnection, { body: userCredentials });
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: userCredentials.email,
      password: userCredentials.password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Add comments to establish activity
  await generate_random_discussion_board_user_articles_comments_create(
    userConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardComment.ICreate,
      params: { articleId: article2.id },
    },
  );
  await generate_random_discussion_board_user_articles_comments_create(
    userConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardComment.ICreate,
      params: { articleId: article3.id },
    },
  );
  // Wait a moment to ensure timestamps are different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Get current time for date range testing
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  // Test date range filtering (last hour)
  const dateRangeResult =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          created_at_start: oneHourAgo.toISOString(),
          created_at_end: now.toISOString(),
          status: "published",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate date range filtering
  TestValidator.predicate(
    "articles within date range",
    dateRangeResult.data.every(
      (article) =>
        new Date(article.created_at) >= oneHourAgo &&
        new Date(article.created_at) <= now,
    ),
  );
  // Test title filtering
  const titleFilterResult =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          title: "Test Article",
          status: "published",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(titleFilterResult);
  TestValidator.predicate(
    "articles match title filter",
    titleFilterResult.data.every((article) =>
      article.title.includes("Test Article"),
    ),
  );
  // Test section filtering
  const sectionFilterResult =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          discussion_board_section_id: section1.id,
          status: "published",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(sectionFilterResult);
  TestValidator.predicate(
    "articles match section filter",
    sectionFilterResult.data.every(
      (article) => article.section.id === section1.id,
    ),
  );
  // Test pagination
  const paginationResult =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          status: "published",
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals("pagination limit", paginationResult.data.length, 2);
  // Test that article1 (no comments) appears in recent activity
  TestValidator.predicate(
    "article without comments appears in recent activity",
    dateRangeResult.data.some((article) => article.id === article1.id),
  );
  // Test combined filters
  const combinedFilterResult =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          created_at_start: oneHourAgo.toISOString(),
          created_at_end: now.toISOString(),
          discussion_board_section_id: section1.id,
          status: "published",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns expected articles",
    combinedFilterResult.data.every(
      (article) =>
        article.section.id === section1.id &&
        new Date(article.created_at) >= oneHourAgo &&
        new Date(article.created_at) <= now,
    ),
  );
}
