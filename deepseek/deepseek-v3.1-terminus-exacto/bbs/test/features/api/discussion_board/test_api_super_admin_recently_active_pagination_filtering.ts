import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_super_admin_recently_active_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create multiple sections for filtering tests
  const sections = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  });
  // Create user connection for comment creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create articles with varying comment activity across sections
  const articles = [];
  for (let i = 0; i < 15; i++) {
    const section = RandomGenerator.pick(sections);
    const article =
      await generate_random_discussion_board_super_admin_articles_create(
        superAdminConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.paragraph({ sentences: 5 }),
            discussion_board_section_id: section.id,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    articles.push(article);
    // Add comments with strategic timestamps for pagination testing
    const commentCount = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
    >();
    for (let j = 0; j < commentCount; j++) {
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.ICreate,
          params: {
            articleId: article.id,
          },
        },
      );
    }
  }
  // Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;
  for (const limit of pageSizes) {
    const page1 =
      await api.functional.discussionBoard.superAdmin.recently_active.recentlyActive(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit satisfies number as number,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(page1);
    TestValidator.equals(
      `page 1 limit ${limit} data count`,
      page1.data.length,
      Math.min(limit, articles.length),
    );
    // Fix: Access the correct nested pagination properties
    const actualPagination = page1.pagination.pagination.pagination.pagination;
    TestValidator.equals(
      `page 1 limit ${limit} total records`,
      actualPagination.records,
      articles.length,
    );
    TestValidator.equals(
      `page 1 limit ${limit} total pages`,
      actualPagination.pages,
      Math.ceil(articles.length / limit),
    );
    // Test second page if it exists
    if (actualPagination.pages > 1) {
      const page2 =
        await api.functional.discussionBoard.superAdmin.recently_active.recentlyActive(
          superAdminConnection,
          {
            body: {
              page: 2,
              limit: limit satisfies number as number,
            } satisfies IDiscussionBoardArticle.IRequest,
          },
        );
      typia.assert(page2);
      TestValidator.equals(
        `page 2 limit ${limit} data count`,
        page2.data.length,
        Math.min(limit, Math.max(0, articles.length - limit)),
      );
    }
  }
  // Test filtering by section
  const targetSection = RandomGenerator.pick(sections);
  const filteredBySection =
    await api.functional.discussionBoard.superAdmin.recently_active.recentlyActive(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: targetSection.id,
          limit: 100 satisfies number as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(filteredBySection);
  // Verify all returned articles belong to the target section
  for (const article of filteredBySection.data) {
    TestValidator.equals(
      "article belongs to filtered section",
      article.section.id,
      targetSection.id,
    );
  }
  // Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const filteredByDate =
    await api.functional.discussionBoard.superAdmin.recently_active.recentlyActive(
      superAdminConnection,
      {
        body: {
          created_at_start: oneDayAgo,
          limit: 100 satisfies number as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(filteredByDate);
  // Verify all returned articles were created within the date range
  for (const article of filteredByDate.data) {
    const articleDate = new Date(article.created_at);
    const filterDate = new Date(oneDayAgo);
    TestValidator.predicate(
      "article created within date range",
      articleDate >= filterDate,
    );
  }
}
