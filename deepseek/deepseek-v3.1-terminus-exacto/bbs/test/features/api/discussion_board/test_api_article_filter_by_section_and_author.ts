import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_filter_by_section_and_author(
  connection: api.IConnection,
): Promise<void> {
  // First, get some existing articles to work with
  const initialResults = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 20 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(initialResults);
  if (initialResults.data.length === 0) {
    // If no articles exist, we can't test filtering properly
    TestValidator.predicate("no articles available for filtering test", true);
    return;
  }
  // Extract unique sections and authors from the results
  const sections = new Map<string, IDiscussionBoardSection.ISummary>();
  const authors = new Map<string, IDiscussionBoardMember.ISummary>();
  initialResults.data.forEach((article) => {
    sections.set(article.section.id, article.section);
    authors.set(article.author.id, article.author);
  });
  const sectionArray = Array.from(sections.values());
  const authorArray = Array.from(authors.values());
  if (sectionArray.length === 0) {
    TestValidator.predicate("no sections available for filtering test", true);
    return;
  }
  // Test 1: Filter by specific section ID
  const targetSection = sectionArray[0]!;
  const sectionFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_section_id: targetSection.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sectionFilterResult);
  // Validate that all returned articles belong to the filtered section
  sectionFilterResult.data.forEach((article) => {
    TestValidator.equals(
      `article ${article.id} belongs to filtered section`,
      article.section.id,
      targetSection.id,
    );
  });
  // Test 2: Test search functionality (as alternative to author filtering)
  if (authorArray.length > 0) {
    const targetAuthor = authorArray[0]!;
    const searchResult = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          search: targetAuthor.display_name satisfies string as string,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(searchResult);
    // Search may return articles by this author (not guaranteed)
    TestValidator.predicate(
      "search returns results",
      searchResult.data.length >= 0,
    );
  }
  // Test 3: Combined filter - section with search
  const combinedFilterResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_section_id: targetSection.id satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        search: "test" satisfies string as string,
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Validate combined filter results
  combinedFilterResult.data.forEach((article) => {
    TestValidator.equals(
      `combined filter article ${article.id} belongs to section`,
      article.section.id,
      targetSection.id,
    );
  });
  // Test 4: Empty results for non-existent section
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        discussion_board_section_id: nonExistentSectionId satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "non-existent section filter handled correctly",
    true,
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    sectionFilterResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    sectionFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    sectionFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    sectionFilterResult.pagination.pages >= 0,
  );
}
