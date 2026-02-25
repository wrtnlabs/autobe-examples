import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_article_draft_pagination_performance(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Test pagination with different page sizes
  const pageSizes = [5, 10, 15] as const;
  for (const pageSize of pageSizes) {
    // Test first page
    const firstPage: IPageIDiscussionBoardArticleDraft.ISummary =
      await api.functional.discussionBoard.user.articles_drafts.index(
        userConnection,
        {
          body: {
            page: 1,
            limit: pageSize,
          } satisfies IDiscussionBoardArticleDraft.IRequest,
        },
      );
    typia.assert(firstPage);
    // Access the deeply nested pagination structure correctly
    const actualPagination =
      firstPage.pagination.pagination.pagination.pagination;
    TestValidator.predicate(
      "first page has valid pagination properties",
      actualPagination.current >= 1 && actualPagination.limit === pageSize,
    );
    // Test middle page if there are enough pages
    if (actualPagination.pages > 2) {
      const middlePageNum = Math.floor(actualPagination.pages / 2);
      const middlePage: IPageIDiscussionBoardArticleDraft.ISummary =
        await api.functional.discussionBoard.user.articles_drafts.index(
          userConnection,
          {
            body: {
              page: middlePageNum,
              limit: pageSize,
            } satisfies IDiscussionBoardArticleDraft.IRequest,
          },
        );
      typia.assert(middlePage);
      const middlePagination =
        middlePage.pagination.pagination.pagination.pagination;
      TestValidator.equals(
        "middle page number",
        middlePagination.current,
        middlePageNum,
      );
    }
    // Test last page
    const lastPage: IPageIDiscussionBoardArticleDraft.ISummary =
      await api.functional.discussionBoard.user.articles_drafts.index(
        userConnection,
        {
          body: {
            page: actualPagination.pages,
            limit: pageSize,
          } satisfies IDiscussionBoardArticleDraft.IRequest,
        },
      );
    typia.assert(lastPage);
    const lastPagination = lastPage.pagination.pagination.pagination.pagination;
    TestValidator.equals(
      "last page number",
      lastPagination.current,
      actualPagination.pages,
    );
  }
  // Test default sorting (most recent first)
  const defaultPage: IPageIDiscussionBoardArticleDraft.ISummary =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Verify drafts are sorted by last_saved_at descending if we have multiple drafts
  if (defaultPage.data.length > 1) {
    for (let i = 1; i < defaultPage.data.length; i++) {
      const current = new Date(defaultPage.data[i].last_saved_at);
      const previous = new Date(defaultPage.data[i - 1].last_saved_at);
      TestValidator.predicate(
        "drafts sorted descending by last_saved_at",
        current <= previous,
      );
    }
  }
  // Test filtering combinations with existing data
  if (defaultPage.data.length > 0) {
    const sampleDraft = defaultPage.data[0];
    const searchTitle = sampleDraft.draft_title.substring(
      0,
      Math.min(5, sampleDraft.draft_title.length),
    );
    const filteredResults: IPageIDiscussionBoardArticleDraft.ISummary =
      await api.functional.discussionBoard.user.articles_drafts.index(
        userConnection,
        {
          body: {
            search_title: searchTitle,
            status: "draft",
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticleDraft.IRequest,
        },
      );
    typia.assert(filteredResults);
    // If we get results, verify they contain the search term
    if (filteredResults.data.length > 0) {
      TestValidator.predicate(
        "filtered results contain search term",
        filteredResults.data.some((draft) =>
          draft.draft_title.includes(searchTitle),
        ),
      );
    }
  }
  // Test performance with date range filtering
  const dateFilteredResults: IPageIDiscussionBoardArticleDraft.ISummary =
    await api.functional.discussionBoard.user.articles_drafts.index(
      userConnection,
      {
        body: {
          last_saved_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_saved_at_to: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(dateFilteredResults);
}
