import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_basic_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Generate random search request with keyword
  const searchRequest: IDiscussionBoardArticle.IRequest = {
    pagination: {
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      offset: 0,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    search: "pol",
  };
  // Execute search with keyword
  const searchResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    typeof searchResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof searchResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records",
    typeof searchResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof searchResult.pagination.pages === "number",
  );
  // Validate sorting (newest first) when multiple results exist
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      TestValidator.predicate(
        `Article ${i} is newer than ${i + 1}`,
        new Date(searchResult.data[i].created_at) >=
          new Date(searchResult.data[i + 1].created_at),
      );
    }
  }
  // Test with empty search string (should return empty list)
  const emptySearchRequest: IDiscussionBoardArticle.IRequest = {
    pagination: {
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    search: "",
  };
  const emptySearchResult =
    await api.functional.discussionBoard.articles.search(connection, {
      body: emptySearchRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns empty",
    emptySearchResult.data.length,
    0,
  );
  // Test with non-existent keyword
  const nonExistentSearchRequest: IDiscussionBoardArticle.IRequest = {
    pagination: {
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    search: "xyznonexistent123abc",
  };
  const nonExistentSearchResult =
    await api.functional.discussionBoard.articles.search(connection, {
      body: nonExistentSearchRequest,
    });
  typia.assert(nonExistentSearchResult);
  TestValidator.equals(
    "non-existent search returns empty",
    nonExistentSearchResult.data.length,
    0,
  );
  // Validate article summary structure when results exist
  if (searchResult.data.length > 0) {
    const article = searchResult.data[0];
    TestValidator.equals("article has id", typeof article.id, "string");
    TestValidator.equals("article has title", typeof article.title, "string");
    TestValidator.equals(
      "article has created_at",
      typeof article.created_at,
      "string",
    );
    TestValidator.equals("article has author", !!article.author, true);
    TestValidator.equals("article has section", !!article.section, true);
    // Validate author structure
    TestValidator.equals("author has id", typeof article.author.id, "string");
    TestValidator.equals(
      "author has session_token",
      typeof article.author.session_token,
      "string",
    );
    TestValidator.equals(
      "author has created_at",
      typeof article.author.created_at,
      "string",
    );
    // Validate section structure
    TestValidator.equals("section has id", typeof article.section.id, "string");
    TestValidator.equals(
      "section has name",
      typeof article.section.name,
      "string",
    );
    TestValidator.equals(
      "section has description",
      typeof article.section.description,
      "string",
    );
    TestValidator.equals(
      "section has created_at",
      typeof article.section.created_at,
      "string",
    );
  }
  // Test search with special characters
  const specialCharSearchRequest: IDiscussionBoardArticle.IRequest = {
    pagination: {
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    search: "test@example.com",
  };
  const specialCharSearchResult =
    await api.functional.discussionBoard.articles.search(connection, {
      body: specialCharSearchRequest,
    });
  typia.assert(specialCharSearchResult);
}
