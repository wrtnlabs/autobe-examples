import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardArticle";

export async function test_api_econpoldiscussionboard_articles_index_public_access(
  connection: api.IConnection,
) {
  {
    // Test default pagination (no filters)
    const output: IPageIEconPolDiscussionBoardArticle.ISummary =
      await api.functional.econPolDiscussionBoard.articles.index(connection, {
        body: {
          page: 1,
          limit: 20,
          search: null,
        } satisfies IEconPolDiscussionBoardArticle.IRequest,
      });
    typia.assert(output);

    // Assert pagination info
    TestValidator.predicate(
      "pagination current page at least 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      output.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      output.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      output.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "data length not exceed limit",
      output.data.length <= output.pagination.limit,
    );

    // Assert each article summary structure
    for (const article of output.data) {
      typia.assert(article);
      TestValidator.predicate(
        "article id is uuid",
        typeof article.id === "string" && article.id.length === 36,
      );
      TestValidator.predicate(
        "article title non-empty",
        typeof article.title === "string" && article.title.length > 0,
      );

      // Assert author
      const author = article.author;
      typia.assert(author);
      TestValidator.predicate(
        "author id is uuid",
        typeof author.id === "string" && author.id.length === 36,
      );
      TestValidator.predicate(
        "author username non-empty",
        typeof author.username === "string" && author.username.length > 0,
      );
      TestValidator.predicate(
        "author displayName non-empty",
        typeof author.displayName === "string" && author.displayName.length > 0,
      );
      if (author.avatarUrl !== null && author.avatarUrl !== undefined)
        TestValidator.predicate(
          "author avatarUrl format",
          typeof author.avatarUrl === "string" &&
            author.avatarUrl.startsWith("http"),
        );
      TestValidator.predicate(
        "author memberSince format",
        typeof author.memberSince === "string" &&
          !isNaN(Date.parse(author.memberSince)),
      );

      // Assert created_at and updated_at are valid date-time strings
      TestValidator.predicate(
        "created_at is valid date-time",
        typeof article.created_at === "string" &&
          !isNaN(Date.parse(article.created_at)),
      );
      TestValidator.predicate(
        "updated_at is valid date-time",
        typeof article.updated_at === "string" &&
          !isNaN(Date.parse(article.updated_at)),
      );
    }
  }

  {
    // Test search filter with sample string
    const searchTerm = RandomGenerator.substring("economic policy");
    const output2: IPageIEconPolDiscussionBoardArticle.ISummary =
      await api.functional.econPolDiscussionBoard.articles.index(connection, {
        body: {
          page: 1,
          limit: 10,
          search: searchTerm,
        } satisfies IEconPolDiscussionBoardArticle.IRequest,
      });
    typia.assert(output2);

    // Assert that returned articles contain the search term in title or author username roughly
    for (const article of output2.data) {
      typia.assert(article);
      const termLower = searchTerm.toLowerCase();
      const titleContains = article.title.toLowerCase().includes(termLower);
      const usernameContains = article.author.username
        .toLowerCase()
        .includes(termLower);
      TestValidator.predicate(
        "article title or author username contains search term",
        titleContains || usernameContains,
      );
    }
  }

  {
    // Test page and limit boundaries
    const output3: IPageIEconPolDiscussionBoardArticle.ISummary =
      await api.functional.econPolDiscussionBoard.articles.index(connection, {
        body: {
          page: 2,
          limit: 5,
          search: null,
        } satisfies IEconPolDiscussionBoardArticle.IRequest,
      });
    typia.assert(output3);

    TestValidator.predicate(
      "pagination current page equals 2",
      output3.pagination.current === 2,
    );
    TestValidator.predicate(
      "pagination limit equals 5",
      output3.pagination.limit === 5,
    );
    TestValidator.predicate(
      "data length does not exceed limit",
      output3.data.length <= 5,
    );
  }
}
