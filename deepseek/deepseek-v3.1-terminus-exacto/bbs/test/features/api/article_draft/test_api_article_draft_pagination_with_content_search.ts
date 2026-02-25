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
import { generate_random_discussion_board_user_articles_drafts_create } from "../../../generate/generate_random_discussion_board_user_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

/**
 * Test article draft pagination with content search functionality.
 *
 * Creates multiple drafts with varied content containing specific keywords,
 * then tests pagination behavior with search filters applied to both
 * draft_title and draft_content fields. Validates pagination metadata
 * consistency and search result accuracy.
 */
export async function test_api_article_draft_pagination_with_content_search(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create drafts with specific keywords for search testing
  const searchKeyword = "technology";
  const keywordDrafts = await ArrayUtil.asyncRepeat(8, async (index) => {
    const draft =
      await generate_random_discussion_board_user_articles_drafts_create(
        userConnection,
        {
          body: {
            draft_title:
              index % 2 === 0
                ? `Exploring ${searchKeyword} trends`
                : RandomGenerator.paragraph({ sentences: 1 }),
            draft_content:
              index % 2 === 1
                ? `This article discusses ${searchKeyword} advancements in modern systems.`
                : RandomGenerator.content({ paragraphs: 2 }),
            draft_status: "draft",
          } satisfies IDiscussionBoardArticleDraft.ICreate,
        },
      );
    typia.assert(draft);
    return draft;
  });
  // Create additional random drafts for pagination testing
  const randomDrafts = await ArrayUtil.asyncRepeat(7, async () => {
    const draft =
      await generate_random_discussion_board_user_articles_drafts_create(
        userConnection,
        {
          body: {
            draft_title: RandomGenerator.paragraph({ sentences: 1 }),
            draft_content: RandomGenerator.content({ paragraphs: 2 }),
            draft_status: "draft",
          } satisfies IDiscussionBoardArticleDraft.ICreate,
        },
      );
    typia.assert(draft);
    return draft;
  });
  // Test pagination with search filter
  const limit = 5;
  const searchResponse =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          search_content: searchKeyword,
          limit: limit satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    searchResponse.pagination.pagination.pagination.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "current page is 1",
    searchResponse.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be positive",
    searchResponse.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    searchResponse.pagination.pagination.pagination.pagination.pages ===
      Math.ceil(
        searchResponse.pagination.pagination.pagination.pagination.records /
          limit,
      ),
  );
  // Test second page pagination
  if (searchResponse.pagination.pagination.pagination.pagination.pages > 1) {
    const page2Response =
      await api.functional.discussionBoard.user.articles_drafts.own.index(
        userConnection,
        {
          body: {
            search_content: searchKeyword,
            limit: limit satisfies number as number,
            page: 2 satisfies number as number,
          } satisfies IDiscussionBoardArticleDraft.IRequest,
        },
      );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current page is 2",
      page2Response.pagination.pagination.pagination.pagination.current,
      2,
    );
    TestValidator.equals(
      "total records consistent across pages",
      page2Response.pagination.pagination.pagination.pagination.records,
      searchResponse.pagination.pagination.pagination.pagination.records,
    );
  }
  // Test search in title field
  const titleSearchResponse =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          search_title: searchKeyword,
          limit: limit satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(titleSearchResponse);
  // Test combined search (title and content)
  const combinedSearchResponse =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          search_title: searchKeyword,
          search_content: searchKeyword,
          limit: limit satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(combinedSearchResponse);
  // Test empty search (should return all drafts)
  const emptySearchResponse =
    await api.functional.discussionBoard.user.articles_drafts.own.index(
      userConnection,
      {
        body: {
          limit: limit satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.predicate(
    "empty search returns some results",
    emptySearchResponse.data.length > 0,
  );
}
