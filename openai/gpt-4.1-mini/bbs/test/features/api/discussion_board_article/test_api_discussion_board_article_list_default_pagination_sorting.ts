import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_article_list_default_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup superAdministrator actor by joining
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // 2. Call the article list index endpoint with empty filters to get default pagination
  const response =
    await api.functional.discussionBoard.superAdministrator.articles.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination metadata fields
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 4. Validate data list is not exceeding limit
  TestValidator.predicate(
    "data length not larger than limit",
    data.length <= pagination.limit,
  );
  // 5. Validate each article summary fields
  for (const article of data) {
    typia.assert(article);
    TestValidator.predicate(
      "article summary has non-empty title",
      article.title.length > 0,
    );
    TestValidator.predicate(
      "article summary has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        article.id,
      ),
    );
    TestValidator.predicate(
      "article has author summary",
      typeof article.author === "object",
    );
    TestValidator.predicate(
      "article has tags array",
      Array.isArray(article.tags),
    );
    TestValidator.predicate(
      "article has commentCount as number",
      typeof article.commentCount === "number",
    );
    TestValidator.predicate(
      "article has createdAt ISO date-time",
      typeof article.createdAt === "string",
    );
  }
  // 6. Check sorting order: newest first (creation timestamps descending)
  for (let i = 1; i < data.length; i++) {
    TestValidator.predicate(
      "articles sorted newest first",
      data[i - 1].createdAt >= data[i].createdAt,
    );
  }
}
