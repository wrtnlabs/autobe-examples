import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_search_basic_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Perform search with keyword "programming" to test the search functionality
  // Note: Since we don't have article creation endpoints available in the provided APIs,
  // we'll test the search functionality with the existing data in the system
  const searchResponse = await api.functional.discussionBoard.user.search(
    userConnection,
    {
      body: {
        search: "programming",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResponse.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    searchResponse.pagination.pages >= 0,
  );
  // Validate article summaries structure
  for (const article of searchResponse.data) {
    typia.assert(article);
    TestValidator.predicate("article has id", article.id.length > 0);
    TestValidator.predicate("article has title", article.title.length > 0);
    TestValidator.predicate("article has status", article.status.length > 0);
    TestValidator.predicate(
      "article has valid created_at",
      article.created_at.length > 0,
    );
    // Validate author information
    typia.assert(article.author);
    TestValidator.predicate("author has id", article.author.id.length > 0);
    TestValidator.predicate(
      "author has display_name",
      article.author.display_name.length > 0,
    );
    // Validate section information
    typia.assert(article.section);
    TestValidator.predicate("section has id", article.section.id.length > 0);
    TestValidator.predicate(
      "section has name",
      article.section.name.length > 0,
    );
    TestValidator.predicate(
      "section has valid status",
      article.section.status === "active" ||
        article.section.status === "inactive" ||
        article.section.status === "archived",
    );
    TestValidator.predicate(
      "section has display_order",
      article.section.display_order >= 0,
    );
  }
  // The search functionality itself is validated by the successful API call and typia.assert
  // Additional validation would require article creation capabilities which are not available
}
