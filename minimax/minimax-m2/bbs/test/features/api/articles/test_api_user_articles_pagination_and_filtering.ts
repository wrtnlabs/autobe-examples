import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

/**
 * Test retrieving a filtered and paginated list of discussion articles written
 * by a specific registered user.
 *
 * Simulates a scenario where a user wants to view their own article history or
 * a moderator wants to review a user's contributions. Validates pagination
 * parameters (page, limit), text search across titles and content, category
 * filtering (Economic Policy, Political Analysis, Market Discussion), status
 * filtering (published, draft), author filtering, sorting options (created_at,
 * updated_at, title, category), and attachment filtering. Ensures the response
 * includes proper pagination metadata and article summaries with all expected
 * fields.
 */
export async function test_api_user_articles_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register a test user to create articles
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: userEmail,
        bio: "Economics enthusiast interested in policy analysis",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user);

  // Step 2: Create multiple test articles with different categories, statuses, and content
  const categories = [
    "Economic Policy",
    "Political Analysis",
    "Market Discussion",
    "Regulatory Updates",
  ] as const;
  const statuses = ["published", "draft"] as const;

  const articles: IEconPoliticalDiscussionArticle[] = [];

  // Create 10 articles with varied content for comprehensive testing
  for (let i = 0; i < 10; i++) {
    const category = RandomGenerator.pick(categories);
    const status = RandomGenerator.pick(statuses);
    const title = `${category} Discussion #${i + 1}`;
    const content = RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    });

    const article: IEconPoliticalDiscussionArticle =
      await api.functional.econPoliticalDiscussion.registeredMember.articles.create(
        connection,
        {
          body: {
            title,
            content,
            category,
            status,
            econ_political_discussion_user_id: user.id,
            attachments:
              i % 3 === 0
                ? [
                    {
                      file_url: `https://example.com/attachment-${i}.pdf`,
                      uploader_name: user.display_name,
                      original_filename: `document-${i}.pdf`,
                      file_type: "application/pdf",
                      file_size: 1024 * (i + 1),
                    },
                  ]
                : undefined,
          } satisfies IEconPoliticalDiscussionArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }

  // Step 3: Add some attachments to specific articles for has_attachments filter testing
  for (let i = 0; i < 3; i++) {
    await api.functional.econPoliticalDiscussion.articles.attachments.create(
      connection,
      {
        articleId: articles[i].id,
        body: {
          file_url: `https://example.com/additional-attachment-${i}.jpg`,
          uploader_name: user.display_name,
          original_filename: `chart-${i}.jpg`,
          file_type: "image/jpeg",
          file_size: 2048 * (i + 1),
        } satisfies IEconPoliticalDiscussionAttachment.ICreate,
      },
    );
  }

  // Step 4: Test basic pagination without filters
  const firstPage: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page should return 5 articles",
    firstPage.data.length,
    5,
  );
  TestValidator.equals(
    "first page should be page 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    firstPage.pagination.limit,
    5,
  );

  // Step 5: Test second page pagination
  const secondPage: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page should return remaining articles",
    secondPage.data.length,
    5,
  );
  TestValidator.equals(
    "second page should be page 2",
    secondPage.pagination.current,
    2,
  );

  // Step 6: Test text search functionality
  const searchTerm = "Discussion"; // Should match all article titles
  const searchResults: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          search: searchTerm,
          limit: 20,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(searchResults);

  TestValidator.equals(
    "search should return all articles with 'Discussion'",
    searchResults.data.length,
    10,
  );
  searchResults.data.forEach((article) => {
    TestValidator.predicate(
      "article title should contain search term",
      article.title.includes(searchTerm) ||
        articles
          .find((a) => a.id === article.id)
          ?.content.includes(searchTerm) ||
        false,
    );
  });

  // Step 7: Test category filtering
  const selectedCategory = "Economic Policy";
  const categoryFiltered: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          category: selectedCategory,
          limit: 20,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(categoryFiltered);

  categoryFiltered.data.forEach((article) => {
    TestValidator.equals(
      "filtered article should match category",
      article.category,
      selectedCategory,
    );
  });

  // Step 8: Test status filtering
  const selectedStatus = "published";
  const statusFiltered: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          status: selectedStatus,
          limit: 20,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(statusFiltered);

  statusFiltered.data.forEach((article) => {
    TestValidator.equals(
      "filtered article should match status",
      article.status,
      selectedStatus,
    );
  });

  // Step 9: Test sorting by creation date (descending)
  const sortedByDate: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          order_by: "created_at",
          order_direction: "desc",
          limit: 10,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(sortedByDate);

  // Verify descending order by created_at
  for (let i = 0; i < sortedByDate.data.length - 1; i++) {
    const currentDate = new Date(sortedByDate.data[i].created_at);
    const nextDate = new Date(sortedByDate.data[i + 1].created_at);
    TestValidator.predicate(
      "articles should be sorted by creation date descending",
      currentDate >= nextDate,
    );
  }

  // Step 10: Test sorting by title (ascending)
  const sortedByTitle: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          order_by: "title",
          order_direction: "asc",
          limit: 10,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(sortedByTitle);

  // Verify ascending order by title
  for (let i = 0; i < sortedByTitle.data.length - 1; i++) {
    TestValidator.predicate(
      "articles should be sorted by title ascending",
      sortedByTitle.data[i].title <= sortedByTitle.data[i + 1].title,
    );
  }

  // Step 11: Test combined filtering (category + status)
  const combinedFiltered: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          category: "Political Analysis",
          status: "draft",
          limit: 20,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(combinedFiltered);

  combinedFiltered.data.forEach((article) => {
    TestValidator.equals(
      "filtered article should match category",
      article.category,
      "Political Analysis",
    );
    TestValidator.equals(
      "filtered article should match status",
      article.status,
      "draft",
    );
  });

  // Step 12: Test has_attachments filter
  const withAttachments: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          has_attachments: true,
          limit: 20,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(withAttachments);

  // Verify that returned articles have attachments (by checking our created test data)
  TestValidator.predicate(
    "should return articles with attachments",
    withAttachments.data.length > 0,
  );

  // Step 13: Test pagination metadata accuracy
  const fullList: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          limit: 20,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(fullList);

  TestValidator.equals(
    "pagination should show correct total records",
    fullList.pagination.records,
    10,
  );
  TestValidator.equals(
    "pagination should calculate correct total pages",
    fullList.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination should show correct limit",
    fullList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "current page should be 1",
    fullList.pagination.current,
    1,
  );

  // Step 14: Test default pagination values
  const defaultPagination: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {} satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(defaultPagination);

  TestValidator.equals(
    "default page should be 1",
    defaultPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultPagination.pagination.limit,
    20,
  );

  // Step 15: Validate article summary structure
  firstPage.data.forEach((article) => {
    TestValidator.equals("article should have id", typeof article.id, "string");
    TestValidator.equals(
      "article should have title",
      typeof article.title,
      "string",
    );
    TestValidator.equals(
      "article should have category",
      typeof article.category,
      "string",
    );
    TestValidator.equals(
      "article should have status",
      typeof article.status,
      "string",
    );
    TestValidator.equals(
      "article should have created_at",
      typeof article.created_at,
      "string",
    );
    TestValidator.equals(
      "article should have updated_at",
      typeof article.updated_at,
      "string",
    );
  });

  // Step 16: Test search with no matches
  const noMatchResults: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: user.id,
        body: {
          search: "NonexistentSearchTermThatDoesNotMatch",
          limit: 20,
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(noMatchResults);

  TestValidator.equals(
    "search with no matches should return empty results",
    noMatchResults.data.length,
    0,
  );
  TestValidator.equals(
    "empty search should show correct total",
    noMatchResults.pagination.records,
    0,
  );
}
