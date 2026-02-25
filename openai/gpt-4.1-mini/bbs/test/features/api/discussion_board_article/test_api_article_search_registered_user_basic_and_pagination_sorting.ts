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

export async function test_api_article_search_registered_user_basic_and_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful article search with keyword and tag filtering
  // 1. Authenticate as a registered user (join).
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strong_password_123",
    },
  });
  typia.assert(userAuthorized);
  userConnection.headers ??= {};
  userConnection.headers.Authorization = userAuthorized.token.access;
  // 2. Prepare a search request with a keyword and list of valid tag UUIDs.
  // For keyword, extract a substring from a random generated title-like string.
  // For tags, create random UUID array.
  const keyword = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 5 }),
  );
  const tagsList = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 3. Submit the search request.
  const searchBody1: IDiscussionBoardArticle.IRequest = {
    search: keyword,
    tags: tagsList,
    page: 1,
    limit: 10,
    sort: "newest",
  };
  const searchResult1 =
    await api.functional.discussionBoard.registeredUser.search.articles.index(
      userConnection,
      { body: searchBody1 },
    );
  typia.assert(searchResult1);
  const { pagination, data } = searchResult1;
  // 4. Verify response includes paginated list matching criteria.
  TestValidator.predicate(
    "pagination is present",
    pagination !== null && pagination !== undefined,
  );
  TestValidator.predicate(
    "articles data array is present",
    Array.isArray(data),
  );
  // 5. Check articles' key fields and their nested properties.
  for (const article of data) {
    typia.assert(article);
    TestValidator.predicate(
      "article title exists",
      typeof article.title === "string" && article.title.length > 0,
    );
    TestValidator.predicate(
      "article commentCount is number",
      typeof article.commentCount === "number" && article.commentCount >= 0,
    );
    TestValidator.predicate(
      "article createdAt format",
      typeof article.createdAt === "string",
    );
    // Validate author fields
    const author = article.author;
    typia.assert(author);
    TestValidator.predicate(
      "author id format uuid",
      typeof author.id === "string" && author.id.length > 0,
    );
    TestValidator.predicate(
      "author email format",
      typeof author.email === "string" && author.email.includes("@"),
    );
    TestValidator.predicate(
      "author displayName format",
      typeof author.displayName === "string",
    );
    TestValidator.predicate(
      "author isBanned boolean",
      typeof author.isBanned === "boolean",
    );
    TestValidator.predicate(
      "author createdAt present",
      typeof author.createdAt === "string",
    );
    TestValidator.predicate(
      "author updatedAt present",
      typeof author.updatedAt === "string",
    );
    TestValidator.predicate(
      "author deletedAt nullable",
      author.deletedAt === null || typeof author.deletedAt === "string",
    );
    // Validate section keys
    const section = article.section;
    typia.assert(section);
    // Validate tags array
    TestValidator.predicate("tags is array", Array.isArray(article.tags));
    for (const tag of article.tags) {
      typia.assert(tag);
      TestValidator.predicate(
        "tag id is uuid",
        typeof tag.id === "string" && tag.id.length > 0,
      );
    }
  }
  // 6. Validate pagination metadata
  TestValidator.equals("pagination current", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 10);
  TestValidator.predicate(
    "pagination records >= data length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination pages equals ceil",
    pagination.pages >= 0,
  );
  // 7. Confirm the sort order defaults to newest first
  for (let i = 1; i < data.length; i++) {
    const prevDate = new Date(data[i - 1].createdAt).getTime();
    const currDate = new Date(data[i].createdAt).getTime();
    TestValidator.predicate(
      `article[${i - 1}] createdAt >= article[${i}] createdAt for newest sort`,
      prevDate >= currDate,
    );
  }
  // Scenario 2: Article search with pagination and sorting by oldest
  // 1. Authenticate as a registered user (join).
  // (reuse userConnection and authorization)
  // 2. Submit a search request with keyword and tag filters, page > 1 and limit
  const page = 2;
  const limit = 5;
  const searchBody2: IDiscussionBoardArticle.IRequest = {
    search: keyword,
    tags: tagsList,
    page,
    limit,
    sort: "oldest",
  };
  // 3. Perform the search request
  const searchResult2 =
    await api.functional.discussionBoard.registeredUser.search.articles.index(
      userConnection,
      { body: searchBody2 },
    );
  typia.assert(searchResult2);
  const { pagination: pagination2, data: data2 } = searchResult2;
  // 4. Verify results presence
  TestValidator.predicate(
    "pagination2 is present",
    pagination2 !== null && pagination2 !== undefined,
  );
  TestValidator.predicate(
    "articles data2 array is present",
    Array.isArray(data2),
  );
  // 5. Check article fields and nested properties
  for (const article of data2) {
    typia.assert(article);
    TestValidator.predicate(
      "article title exists",
      typeof article.title === "string" && article.title.length > 0,
    );
    TestValidator.predicate(
      "article commentCount is number",
      typeof article.commentCount === "number" && article.commentCount >= 0,
    );
    TestValidator.predicate(
      "article createdAt format",
      typeof article.createdAt === "string",
    );
    const author = article.author;
    typia.assert(author);
    TestValidator.predicate(
      "author id format uuid",
      typeof author.id === "string" && author.id.length > 0,
    );
    TestValidator.predicate(
      "author email format",
      typeof author.email === "string" && author.email.includes("@"),
    );
    TestValidator.predicate(
      "author displayName format",
      typeof author.displayName === "string",
    );
    TestValidator.predicate(
      "author isBanned boolean",
      typeof author.isBanned === "boolean",
    );
    TestValidator.predicate(
      "author createdAt present",
      typeof author.createdAt === "string",
    );
    TestValidator.predicate(
      "author updatedAt present",
      typeof author.updatedAt === "string",
    );
    TestValidator.predicate(
      "author deletedAt nullable",
      author.deletedAt === null || typeof author.deletedAt === "string",
    );
    const section = article.section;
    typia.assert(section);
    TestValidator.predicate("tags is array", Array.isArray(article.tags));
    for (const tag of article.tags) {
      typia.assert(tag);
      TestValidator.predicate(
        "tag id is uuid",
        typeof tag.id === "string" && tag.id.length > 0,
      );
    }
  }
  // 6. Validate pagination metadata for page 2
  TestValidator.equals("pagination2 current", pagination2.current, page);
  TestValidator.equals("pagination2 limit", pagination2.limit, limit);
  TestValidator.predicate(
    "pagination2 records >= data2 length",
    pagination2.records >= data2.length,
  );
  TestValidator.predicate("pagination2 pages >= 0", pagination2.pages >= 0);
  // 7. Validate sort order oldest (ascending by creation time)
  for (let i = 1; i < data2.length; i++) {
    const prevDate = new Date(data2[i - 1].createdAt).getTime();
    const currDate = new Date(data2[i].createdAt).getTime();
    TestValidator.predicate(
      `article2[${i - 1}] createdAt <= article2[${i}] createdAt for oldest sort`,
      prevDate <= currDate,
    );
  }
}
