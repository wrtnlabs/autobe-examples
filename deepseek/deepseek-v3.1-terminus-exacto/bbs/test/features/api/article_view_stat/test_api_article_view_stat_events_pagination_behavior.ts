import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_view_stat_events_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Generate multiple view events by simulating view events
  // Since we don't have a dedicated endpoint to create view events,
  // we'll rely on the system potentially generating them through normal usage
  // or we'll test with whatever events exist in the system
  // Test pagination with different page sizes
  const pageSizes = [5, 10, 20] as const;
  for (const limit of pageSizes) {
    const page1 =
      await api.functional.discussionBoard.articles.view_stat_events.index(
        userConnection,
        {
          articleId: article.id,
          body: {
            page: 1,
            limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >() satisfies number as number,
          } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
        },
      );
    typia.assert(page1);
    // Validate pagination metadata
    TestValidator.equals(
      `page 1 with limit ${limit} current page`,
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 with limit ${limit} limit`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} total records non-negative`,
      page1.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page 1 with limit ${limit} total pages calculation`,
      page1.pagination.pages === Math.ceil(page1.pagination.records / limit),
    );
    // Test data count matches limit (unless last page)
    if (page1.pagination.current < page1.pagination.pages) {
      TestValidator.equals(
        `page 1 with limit ${limit} data count matches limit`,
        page1.data.length,
        limit,
      );
    }
    // Test page navigation if there are multiple pages
    if (page1.pagination.pages > 1) {
      const page2 =
        await api.functional.discussionBoard.articles.view_stat_events.index(
          userConnection,
          {
            articleId: article.id,
            body: {
              page: 2,
              limit: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<100>
              >() satisfies number as number,
            } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
          },
        );
      typia.assert(page2);
      TestValidator.equals(
        `page 2 with limit ${limit} current page`,
        page2.pagination.current,
        2,
      );
      TestValidator.equals(
        `page 2 with limit ${limit} total records consistency`,
        page2.pagination.records,
        page1.pagination.records,
      );
      TestValidator.equals(
        `page 2 with limit ${limit} total pages consistency`,
        page2.pagination.pages,
        page1.pagination.pages,
      );
      // Ensure data from different pages doesn't overlap
      const page1Ids = new Set(page1.data.map((event) => event.id));
      const page2Ids = new Set(page2.data.map((event) => event.id));
      TestValidator.predicate(
        `page 1 and page 2 with limit ${limit} no overlapping events`,
        Array.from(page1Ids).every((id) => !page2Ids.has(id)),
      );
    }
  }
  // Test edge case: page beyond total pages
  const lastPageResponse =
    await api.functional.discussionBoard.articles.view_stat_events.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 100, // Very high page number
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(lastPageResponse);
  // Should return empty data but valid pagination metadata
  TestValidator.predicate(
    "page beyond total pages returns empty data",
    lastPageResponse.data.length === 0,
  );
  TestValidator.predicate(
    "page beyond total pages has valid pagination",
    lastPageResponse.pagination.current === 100 &&
      lastPageResponse.pagination.pages >= 1,
  );
}