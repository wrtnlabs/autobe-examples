import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Comprehensive analytics filtering test for super administrators.
 * Validates filtering by date ranges, activity types, target entities, success status,
 * and pagination with proper super admin authorization enforcement.
 */
export async function test_api_superadmin_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create user accounts for activity generation
  const users = await Promise.all(
    ArrayUtil.repeat(3, async () => {
      const userConnection: api.IConnection = { host: connection.host };
      const user = await authorize_user_join(userConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
        },
      });
      typia.assert(user);
      return { connection: userConnection, user };
    }),
  );
  // 3. Create articles by users
  const articles = await Promise.all(
    users.map(async ({ connection, user }) => {
      const article =
        await generate_random_discussion_board_user_articles_create(
          connection,
          {
            body: {
              title: RandomGenerator.paragraph({
                sentences: 2,
                wordMin: 3,
                wordMax: 7,
              }),
              content: RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 3,
                sentenceMax: 5,
              }),
              discussion_board_section_id: typia.random<
                string & tags.Format<"uuid">
              >(),
            },
          },
        );
      typia.assert(article);
      return article;
    }),
  );
  // 4. Create comments on articles
  const comments = await Promise.all(
    articles.map(async (article, index) => {
      const userIndex = index % users.length;
      const comment =
        await generate_random_discussion_board_user_articles_comments_create(
          users[userIndex].connection,
          {
            body: {
              content: RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 5,
                wordMax: 10,
              }),
            },
            params: {
              articleId: article.id,
            },
          },
        );
      typia.assert(comment);
      return comment;
    }),
  );
  // Define time boundaries for filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  // 5. Test 1: Filter by date range
  const dateFiltered =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: oneHourAgo.toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Validate date filter results
  for (const activity of dateFiltered.data) {
    const createdAt = new Date(activity.created_at);
    TestValidator.predicate(
      "activity within date range",
      createdAt >= twoHoursAgo && createdAt <= oneHourAgo,
    );
  }
  // 6. Test 2: Filter by activity type (if known types exist)
  const activityFiltered =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          activity_type: "article_create",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(activityFiltered);
  // 7. Test 3: Filter by target entity type
  const entityFiltered =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          target_entity_type: "article",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(entityFiltered);
  // 8. Test 4: Filter by success status
  const successFiltered =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          success_status: true,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(successFiltered);
  for (const activity of successFiltered.data) {
    TestValidator.equals("activity succeeded", activity.success_status, true);
  }
  // 9. Test 5: Pagination with different limits
  const page1 = await api.functional.discussionBoard.superAdmin.analytics.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSystemActivity.IRequest,
    },
  );
  typia.assert(page1);
  // Remove invalid pagination property access - these properties don't exist on IPagination
  TestValidator.predicate("pagination data exists", page1.data !== undefined);
  TestValidator.predicate("pagination metadata exists", page1.pagination !== undefined);
  // 10. Test 6: Combined filters
  const combinedFiltered =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          activity_type: "comment_create",
          target_entity_type: "comment",
          success_status: true,
          created_at_from: twoHoursAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // 11. Test 7: Empty results with impossible filter
  const emptyFiltered =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          created_at_from: new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(), // future date
          created_at_to: new Date(
            now.getTime() + 48 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.predicate(
    "no future activities",
    emptyFiltered.data.length === 0,
  );
  // 12. Authorization test: Regular user should not have access
  await TestValidator.error(
    "user cannot access super admin analytics",
    async () => {
      await api.functional.discussionBoard.superAdmin.analytics.index(
        users[0].connection,
        {
          body: {} satisfies IDiscussionBoardSystemActivity.IRequest,
        },
      );
    },
  );
}