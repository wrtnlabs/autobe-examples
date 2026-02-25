import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_articles_search_keyword_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login a new registered user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
      },
    },
  );
  typia.assert(registeredUser);
  // 2. Prepare a keyword substring from a random title or content
  // For the purpose of the test, generate a word and use it as keyword
  // since we don't have direct access to created articles here.
  const keyword = RandomGenerator.alphabets(5);
  // 3. Perform search with keyword only (no tag filters)
  const searchRequest: IDiscussionBoardArticle.IRequest = {
    search: keyword,
    tags: null,
    page: 1,
    limit: 10,
    sort: "newest",
    sectionId: null,
  };
  const output =
    await api.functional.discussionBoard.registeredUser.articles.search(
      registeredUserConnection,
      { body: searchRequest },
    );
  typia.assert(output);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "valid current page",
    output.pagination.current === 1,
  );
  TestValidator.predicate("valid limit", output.pagination.limit === 10);
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // 5. Validate the data array type and properties
  output.data.forEach((article) => {
    typia.assert(article);
    typia.assert(article.author);
    typia.assert(article.section);
    TestValidator.predicate(
      "article title includes keyword (lowercase) or content not directly checked",
      article.title.toLowerCase().includes(keyword.toLowerCase()),
    );
    TestValidator.predicate(
      "article createdAt is ISO 8601",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(article.createdAt),
    );
    // Check tags array is present
    TestValidator.predicate(
      "article tags array exists",
      Array.isArray(article.tags),
    );
  });
}
