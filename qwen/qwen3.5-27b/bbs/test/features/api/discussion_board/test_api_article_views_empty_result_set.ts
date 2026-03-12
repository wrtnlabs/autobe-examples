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
 * Test that retrieving view events for an article with no recorded views
 * returns an empty but valid response.
 *
 * This test validates the edge case where an article exists but has no view
 * history yet. The test creates a fresh article and immediately queries its
 * view events to ensure the API returns a properly structured empty result set
 * with correct pagination metadata.
 */
export async function test_api_article_views_empty_result_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/login",
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  // 2. Create a section for the article
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Authenticate as member to create article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com/member",
      referrer: "https://test.com/join",
    },
  });
  // 4. Create a new article in the section (with no views yet)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // Verify article exists and is not soft-deleted
  TestValidator.predicate("article has valid id", article.id.length > 0);
  TestValidator.predicate(
    "article is not soft-deleted",
    article.deleted_at === null,
  );
  // 5. Immediately call the views endpoint for this article
  const viewsResponse =
    await api.functional.discussionBoard.administrator.articles.views.index(
      adminConnection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(viewsResponse);
  // 6. Verify pagination shows records=0 and pages=0
  TestValidator.equals(
    "records count is zero",
    viewsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is zero",
    viewsResponse.pagination.pages,
    0,
  );
  // 7. Verify data array is empty
  TestValidator.equals("data array is empty", viewsResponse.data.length, 0);
}
