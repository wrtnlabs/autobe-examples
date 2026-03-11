import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";

export async function test_api_comment_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for test setup
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEconomicPoliticalBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
        name,
        href,
        referrer,
        ip,
      } satisfies IEconomicPoliticalBoardMember.IJoin,
    });
  typia.assert(member);
  // 2. Create article for comment testing using utility function
  const article =
    await generate_random_economic_political_board_member_articles_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(article);
  // 3. Post 50+ comments to ensure multiple pages
  const articleCommentsConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(articleCommentsConnection, {
    body: { email, password },
  });
  const commentCount = 50;
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_economic_political_board_member_articles_comments_create(
        articleCommentsConnection,
        {
          params: { articleId: article.id },
          body: {
            content: `Test comment ${i + 1}`,
          },
        },
      );
    typia.assert(comment);
  }
  // 4. Test pagination and sorting
  const commentsConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(commentsConnection, {
    body: { email, password },
  });
  // Test page 1 with limit 20, newest first (default)
  const response1 =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(response1);
  TestValidator.equals("page 1 current", response1.pagination.current, 1);
  TestValidator.equals("page 1 pages", response1.pagination.pages, 3); // 50/20 = 3 pages
  TestValidator.equals("page 1 limit", response1.pagination.limit, 20);
  TestValidator.equals(
    "page 1 records",
    response1.pagination.records,
    commentCount,
  );
  TestValidator.equals("page 1 data length", response1.data.length, 20);
  // Test page 2 with limit 20
  const response2 =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 20,
        },
      },
    );
  typia.assert(response2);
  TestValidator.equals("page 2 current", response2.pagination.current, 2);
  TestValidator.equals("page 2 data length", response2.data.length, 20);
  // Test page 3 with limit 20 (last page)
  const response3 =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {
          page: 3,
          limit: 20,
        },
      },
    );
  typia.assert(response3);
  TestValidator.equals("page 3 current", response3.pagination.current, 3);
  TestValidator.equals("page 3 data length", response3.data.length, 10);
  // Test page 4 (beyond available pages)
  const response4 =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {
          page: 4,
          limit: 20,
        },
      },
    );
  typia.assert(response4);
  TestValidator.equals("page 4 data length", response4.data.length, 0);
  // Test sorting with oldest first
  const response5 =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sortDirection: "oldest",
        },
      },
    );
  typia.assert(response5);
  TestValidator.equals("oldest sort data length", response5.data.length, 20);
  // Test boundary limit with 5 per page
  const response6 =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(response6);
  TestValidator.equals("limit 5 pages", response6.pagination.pages, 10); // 50/5 = 10
  TestValidator.equals("limit 5 data length", response6.data.length, 5);
  // Test boundary limit with 100 per page (max)
  const response7 =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(response7);
  TestValidator.equals("limit 100 pages", response7.pagination.pages, 1);
  TestValidator.equals(
    "limit 100 data length",
    response7.data.length,
    commentCount,
  );
}