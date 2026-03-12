import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that an authenticated administrator can retrieve a paginated list of view events for a specific article.
 * The test validates the primary success path for article analytics retrieval, including pagination metadata
 * and view event summary structure.
 */
export async function test_api_article_views_retrieve_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a section for the article
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Authenticate as member to create an article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 4. Create an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(article);
  // 5. Retrieve paginated view events for the article
  const viewsResponse =
    await api.functional.discussionBoard.administrator.articles.views.index(
      adminConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          pageSize: 10,
          sortOrder: "desc",
        } satisfies IDiscussionBoardArticleView.IRequest,
      },
    );
  typia.assert(viewsResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    viewsResponse.pagination.current,
    1,
  );
  TestValidator.equals("page limit is 10", viewsResponse.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    viewsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    viewsResponse.pagination.pages >= 0,
  );
  // 7. Validate data array structure
  TestValidator.predicate(
    "data array length matches pagination",
    viewsResponse.data.length <= viewsResponse.pagination.limit,
  );
  // 8. Validate each view event summary structure (if any views exist)
  await ArrayUtil.asyncForEach(viewsResponse.data, async (view, index) => {
    typia.assert(view);
    // Validate view references correct article
    TestValidator.equals(
      `view[${index}] references correct article`,
      view.article.id,
      article.id,
    );
    // Member can be null for guest views
    if (view.member !== null) {
      typia.assert(view.member);
    }
  });
  // 9. Validate views are sorted by viewed_at descending (if multiple views exist)
  if (viewsResponse.data.length > 1) {
    for (let i = 1; i < viewsResponse.data.length; i++) {
      TestValidator.predicate(
        `views are sorted descending: view[${i - 1}].viewed_at >= view[${i}].viewed_at`,
        new Date(viewsResponse.data[i - 1].viewed_at).getTime() >=
          new Date(viewsResponse.data[i].viewed_at).getTime(),
      );
    }
  }
}
