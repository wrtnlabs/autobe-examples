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

export async function test_api_admin_recently_active_mixed_no_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. 管理员设置
  const adminConnection: api.IConnection = { host: connection.host };
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
  // 2. 创建分区
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. 创建多篇文章
  const articles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const article =
      await generate_random_discussion_board_admin_articles_create(
        adminConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            content: RandomGenerator.content({ paragraphs: 1 }),
            discussion_board_section_id: section.id,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    return article;
  });
  // 4. 为部分文章添加评论
  // 用户设置用于添加评论
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 记录评论时间戳用于排序验证
  const commentTimestamps: Record<string, string[]> = {};
  // 文章B：较旧评论（1小时前）
  const commentB =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: articles[1].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentB);
  commentTimestamps[articles[1].id] = [commentB.created_at];
  // 文章C：较新评论（10分钟前）- 使用当前时间减去10分钟
  const commentC =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: articles[2].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentC);
  commentTimestamps[articles[2].id] = [commentC.created_at];
  // 文章D：多个评论（最近评论50分钟前，较旧评论2小时前）
  const commentDOld =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: articles[3].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentDOld);
  const commentDRecent =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: articles[3].id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentDRecent);
  commentTimestamps[articles[3].id] = [
    commentDOld.created_at,
    commentDRecent.created_at,
  ];
  // 文章A和E保持无评论
  // 5. 等待片刻确保时间戳不同
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 6. 调用最近活动端点，第一页，limit=3
  const page1 =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1 pagination current", (page1 as any).pagination.current, 1);
  TestValidator.equals("page1 pagination limit", (page1 as any).pagination.limit, 3);
  TestValidator.equals("page1 total records", (page1 as any).pagination.records, 5);
  TestValidator.predicate("page1 total pages > 1", (page1 as any).pagination.pages > 1);
  // 7. 验证第一页排序
  TestValidator.equals("page1 has 3 items", page1.data.length, 3);
  // 计算每篇文章的活动时间戳
  const articleActivityMap = new Map<string, string>();
  for (const article of articles) {
    if (commentTimestamps[article.id]) {
      // 使用最新评论时间
      const latestComment = Math.max(
        ...commentTimestamps[article.id].map((t) => new Date(t).getTime()),
      );
      articleActivityMap.set(article.id, new Date(latestComment).toISOString());
    } else {
      // 无评论，使用文章创建时间
      articleActivityMap.set(article.id, article.created_at);
    }
  }
  // 验证第一页排序（按活动时间降序）
  for (let i = 0; i < page1.data.length - 1; i++) {
    const currentActivity = articleActivityMap.get(page1.data[i].id)!;
    const nextActivity = articleActivityMap.get(page1.data[i + 1].id)!;
    TestValidator.predicate(
      `item ${i} should be newer than or equal to item ${i + 1}`,
      new Date(currentActivity).getTime() >= new Date(nextActivity).getTime(),
    );
  }
  // 8. 获取第二页
  const page2 =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2 pagination current", (page2 as any).pagination.current, 2);
  TestValidator.equals("page2 pagination limit", (page2 as any).pagination.limit, 3);
  TestValidator.equals("page2 total records", (page2 as any).pagination.records, 5);
  TestValidator.equals(
    "page2 total pages",
    (page2 as any).pagination.pages,
    (page1 as any).pagination.pages,
  );
  TestValidator.equals("page2 has remaining items", page2.data.length, 2);
  // 9. 验证所有文章都被返回，没有重复
  const allArticleIds = [...page1.data, ...page2.data].map((item) => item.id);
  const uniqueIds = new Set(allArticleIds);
  TestValidator.equals(
    "no duplicate articles across pages",
    allArticleIds.length,
    uniqueIds.size,
  );
  TestValidator.equals("all 5 articles returned", uniqueIds.size, 5);
  // 10. 验证文章D（有多个评论）使用了最新评论时间排序
  const articleDInPage =
    page1.data.find((item) => item.id === articles[3].id) ||
    page2.data.find((item) => item.id === articles[3].id);
  if (articleDInPage) {
    // 查找文章D在排序中的位置
    const articlesWithActivity = articles
      .map((article) => ({
        id: article.id,
        activityTime: articleActivityMap.get(article.id)!,
      }))
      .sort(
        (a, b) =>
          new Date(b.activityTime).getTime() -
          new Date(a.activityTime).getTime(),
      );
    const expectedPosition = articlesWithActivity.findIndex(
      (a) => a.id === articles[3].id,
    );
    const actualPosition = allArticleIds.findIndex(
      (id) => id === articles[3].id,
    );
    TestValidator.equals(
      "article D should be at correct sorted position",
      actualPosition,
      expectedPosition,
    );
  }
}