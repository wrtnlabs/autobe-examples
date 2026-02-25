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

export async function test_api_super_admin_recently_active_comments_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create multiple sections
  const sections = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  });
  // Create multiple published articles
  const articles = await ArrayUtil.asyncRepeat(5, async () => {
    const section = RandomGenerator.pick(sections);
    return await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.paragraph({ sentences: 5 }),
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Add comments with artificial delays to create different timestamps
  const commentTimestamps: {
    articleId: string;
    timestamp: Date;
  }[] = [];
  // Add comments to articles with increasing delays
  for (let i = 0; i < 3; i++) {
    const article = articles[i];
    // Add delay to create different comment timestamps
    await new Promise((resolve) => setTimeout(resolve, 100 * i));
    const comment =
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
    commentTimestamps.push({
      articleId: article.id,
      timestamp: new Date(comment.created_at),
    });
  }
  // Sort by expected order (most recent comment first)
  const expectedOrder = [...commentTimestamps]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map((item) => item.articleId);
  // Test the recently-active endpoint
  const response =
    await api.functional.discussionBoard.superAdmin.recently_active.recentlyActive(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // Validate that we got results
  TestValidator.predicate("has articles in response", response.data.length > 0);
  // Extract article IDs from response in the order they appear
  const responseArticleIds = response.data.map((a) => a.id);
  // Validate that articles with comments appear in the correct order
  // Find the positions of our commented articles in the response
  const commentedArticlePositions = expectedOrder
    .map((articleId) => responseArticleIds.indexOf(articleId))
    .filter((pos) => pos !== -1);
  // If we have multiple commented articles in the response, validate their order
  if (commentedArticlePositions.length > 1) {
    // Check if commented articles maintain their relative order
    const isOrdered = commentedArticlePositions.every(
      (pos, index, array) => index === 0 || pos > array[index - 1],
    );
    TestValidator.predicate(
      "commented articles maintain relative order",
      isOrdered,
    );
  }
  // Validate pagination metadata - fix property access
  TestValidator.predicate(
    "pagination has current page",
    (response.pagination as any).current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    (response.pagination as any).limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    (response.pagination as any).records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    (response.pagination as any).pages >= 0,
  );
}