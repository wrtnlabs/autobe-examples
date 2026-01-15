import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_category_filtering_by_citizen(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenAuth: IDiscussionBoardUser.IAuthorized =
    await authorize_member_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
  typia.assert(citizenAuth);
  // Step 2: Fetch categories with default parameters (should return only active categories)
  const categoriesResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      citizenConnection,
      {
        body: {
          // Default pagination: page: 1, limit: 20
          // Default sort: order_index (asc)
          // Default status: only active categories (citizen users cannot see inactive/archived)
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(categoriesResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has correct current page",
    categoriesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    categoriesResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has at least one record",
    categoriesResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has correct number of pages",
    categoriesResponse.pagination.pages > 0,
  );
  // Validate categories data structure and status
  TestValidator.predicate(
    "categories array is not empty",
    categoriesResponse.data.length > 0,
  );
  for (const category of categoriesResponse.data) {
    TestValidator.equals(
      "category status is active",
      category.status,
      "active",
    );
  }
  // Step 3: Test name partial matching filter
  // Get a random category name from the response
  const randomCategory = RandomGenerator.pick(categoriesResponse.data);
  const namePrefix = randomCategory.title.substring(
    0,
    Math.max(2, Math.floor(randomCategory.title.length / 3)),
  );
  const nameFilteredResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      citizenConnection,
      {
        body: {
          name: namePrefix,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(nameFilteredResponse);
  // Validate name filtering result
  TestValidator.predicate(
    "name filtered results are not empty",
    nameFilteredResponse.data.length > 0,
  );
  for (const category of nameFilteredResponse.data) {
    TestValidator.predicate(
      "category title contains search prefix",
      category.title.toLowerCase().includes(namePrefix.toLowerCase()) === true,
    );
    TestValidator.equals(
      "category status is active",
      category.status,
      "active",
    );
  }
  // Step 4: Test description keyword filter
  // Find a category with description and extract a keyword from it
  const categoryWithDesc = categoriesResponse.data.find((c) => c.description);
  if (categoryWithDesc && categoryWithDesc.description !== undefined && categoryWithDesc.description !== null) {
    // Extract a single word from the description
    const descriptionWords = categoryWithDesc.description.split(/\s+/);
    const keyword = RandomGenerator.pick(descriptionWords);
    const descFilteredResponse: IPageIDiscussionBoardArticleCategory.ISummary =
      await api.functional.discussionBoard.articles.categories.index(
        citizenConnection,
        {
          body: {
            description: keyword,
          } satisfies IDiscussionBoardArticleCategory.IRequest,
        },
      );
    typia.assert(descFilteredResponse);
    // Validate description filtering result
    TestValidator.predicate(
      "description filtered results are not empty",
      descFilteredResponse.data.length > 0,
    );
    for (const category of descFilteredResponse.data) {
      TestValidator.predicate(
        "category description contains search keyword",
        category.description != null && category.description.toLowerCase().includes(keyword.toLowerCase()) === true,
      );
      TestValidator.equals(
        "category status is active",
        category.status,
        "active",
      );
    }
  }
  // Step 5: Test pagination with limit variation
  const limit = 5;
  const page = 2;
  const paginatedResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      citizenConnection,
      {
        body: {
          limit,
          page,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination parameters
  TestValidator.equals(
    "pagination has correct page",
    paginatedResponse.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination has correct limit",
    paginatedResponse.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page has at most limit number of results",
    paginatedResponse.data.length <= limit,
  );
  // Step 6: Test sorting by name (ascending)
  const nameSortedResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "name",
          order: "asc",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(nameSortedResponse);
  // Validate that categories are sorted by name alphabetically
  TestValidator.predicate(
    "categories are sorted by name ascending",
    nameSortedResponse.data.length <= 1 ||
      nameSortedResponse.data.every((cat, index) => {
        if (index === 0) return true;
        return nameSortedResponse.data[index - 1].title <= cat.title;
      }),
  );
  // Step 7: Test sorting by article count (descending)
  const articleCountSortedResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "article_count",
          order: "desc",
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(articleCountSortedResponse);
  // Validate that categories are sorted by article count descending
  TestValidator.predicate(
    "categories are sorted by article count descending",
    articleCountSortedResponse.data.length <= 1 ||
      articleCountSortedResponse.data.every((cat, index) => {
        if (index === 0) return true;
        return (
          (articleCountSortedResponse.data[index - 1].article_count || 0) >=
          (cat.article_count || 0)
        );
      }),
  );
  // Step 8: Test created_at_from filter
  // Use the first category's created_at as the from date
  if (categoriesResponse.data.length > 0) {
    const referenceDate = categoriesResponse.data[0].created_at;
    const createdAtFromResponse: IPageIDiscussionBoardArticleCategory.ISummary =
      await api.functional.discussionBoard.articles.categories.index(
        citizenConnection,
        {
          body: {
            created_at_from: referenceDate,
          } satisfies IDiscussionBoardArticleCategory.IRequest,
        },
      );
    typia.assert(createdAtFromResponse);
    // Validate results are from the reference date onward
    TestValidator.predicate(
      "filtered results are not empty",
      createdAtFromResponse.data.length > 0,
    );
    for (const category of createdAtFromResponse.data) {
      TestValidator.predicate(
        "category created_at is after or equal to reference",
        category.created_at >= referenceDate,
      );
      TestValidator.equals(
        "category status is active",
        category.status,
        "active",
      );
    }
  }
  // Step 9: Test created_at_to filter
  // Use the last category's created_at as the to date
  if (categoriesResponse.data.length > 0) {
    const referenceDate =
      categoriesResponse.data[categoriesResponse.data.length - 1].created_at;
    const createdAtToResponse: IPageIDiscussionBoardArticleCategory.ISummary =
      await api.functional.discussionBoard.articles.categories.index(
        citizenConnection,
        {
          body: {
            created_at_to: referenceDate,
          } satisfies IDiscussionBoardArticleCategory.IRequest,
        },
      );
    typia.assert(createdAtToResponse);
    // Validate results are up to the reference date
    TestValidator.predicate(
      "filtered results are not empty",
      createdAtToResponse.data.length > 0,
    );
    for (const category of createdAtToResponse.data) {
      TestValidator.predicate(
        "category created_at is before or equal to reference",
        category.created_at <= referenceDate,
      );
      TestValidator.equals(
        "category status is active",
        category.status,
        "active",
      );
    }
  }
  // Step 10: Validate that citizen cannot filter by inactive status
  await TestValidator.error(
    "citizen users cannot filter by inactive status",
    async () => {
      await api.functional.discussionBoard.articles.categories.index(
        citizenConnection,
        {
          body: {
            status: "inactive" as "active" | "inactive" | null | undefined,
          } satisfies IDiscussionBoardArticleCategory.IRequest,
        },
      );
    },
  );
  // Step 11: Validate that citizen cannot filter by archived status
  await TestValidator.error(
    "citizen users cannot filter by archived status",
    async () => {
      await api.functional.discussionBoard.articles.categories.index(
        citizenConnection,
        {
          body: {
            status: "archived" as "active" | "inactive" | null | undefined,
          } satisfies IDiscussionBoardArticleCategory.IRequest,
        },
      );
    },
  );
}
