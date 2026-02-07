import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_discussion_board_member_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for searching articles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Prepare test data: create multiple articles for pagination testing
  const articleCount = 25;
  const articles: IDiscussionBoardArticle.ISummary[] = [];
  // Create test articles with varied content for pagination testing
  for (let i = 0; i < articleCount; i++) {
    const article =
      await api.functional.discussionBoard.member.search.articles.index(
        memberConnection,
        {
          body: {
            // IDiscussionBoardArticle.IRequest has no required fields currently
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(article);
    articles.push(...article.data);
  }
  // Test pagination: verify page 1 with limit 10
  const page1Response =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 has 10 items",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 has correct record count",
    page1Response.pagination.records,
    articleCount,
  );
  TestValidator.equals(
    "page 1 is correct page",
    page1Response.pagination.current,
    1,
  );
  // Test pagination: verify page 2
  const page2Response =
    await api.functional.discussionBoard.member.search.articles.index(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.IRequest has no required fields currently
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 is correct page",
    page2Response.pagination.current,
    2,
  );
  // Test pagination: verify page size calculation
  TestValidator.equals(
    "pages calculation correct",
    page1Response.pagination.pages,
    Math.ceil(articleCount / page1Response.pagination.limit),
  );
  // Test pagination: verify limit parameter
  TestValidator.predicate(
    "limit is positive",
    page1Response.pagination.limit > 0,
  );
  // Test pagination: verify records count
  TestValidator.predicate(
    "records count is non-negative",
    page1Response.pagination.records >= 0,
  );
}
