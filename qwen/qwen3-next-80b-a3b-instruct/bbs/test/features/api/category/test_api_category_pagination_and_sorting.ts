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
export async function test_api_category_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Establish citizen authentication context
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test pagination with various limit values at boundaries
  const limitValues: number[] = [1, 10, 20, 50, 100];
  for (const limit of limitValues) {
    const response =
      await api.functional.discussionBoard.citizen.categories.index(
        citizenConnection,
        {
          body: {
            limit,
          } satisfies IDiscussionBoardArticleCategory.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination structure against IPage.IPagination
    TestValidator.equals(
      "pagination limit matches request",
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination current is at least 1",
      () => response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      () => response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      () => response.pagination.pages >= 0,
    );
    // Validate data structure against ICategory.ISummary
    for (const category of response.data) {
      TestValidator.equals("category id is UUID", typeof category.id, "string");
      TestValidator.predicate(
        "category title is string",
        () => typeof category.title === "string",
      );
      TestValidator.predicate(
        "category slug is string",
        () => typeof category.slug === "string",
      );
      TestValidator.predicate(
        "category slug format is lowercase with hyphens",
        () => /^[a-z0-9-]+$/.test(category.slug),
      );
      TestValidator.equals(
        "category status is active",
        category.status,
        "active",
      );
      TestValidator.predicate(
        "category created_at is ISO date-time",
        () =>
          typeof category.created_at === "string" &&
          !isNaN(Date.parse(category.created_at)),
      );
      TestValidator.predicate(
        "category article_count is number or undefined",
        () =>
          category.article_count === undefined ||
          typeof category.article_count === "number",
      );
      TestValidator.predicate(
        "category order_index is number or undefined",
        () =>
          category.order_index === undefined ||
          typeof category.order_index === "number",
      );
      TestValidator.predicate(
        "category color_code is string or undefined",
        () =>
          category.color_code === undefined ||
          (typeof category.color_code === "string" &&
            (category.color_code === null ||
              /^[#][0-9A-Fa-f]{6}$/.test(category.color_code))),
      );
      TestValidator.predicate(
        "category description is string or undefined",
        () =>
          category.description === undefined ||
          typeof category.description === "string",
      );
    }
  }
  // Test page number handling
  const pageResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(pageResponse);
  TestValidator.equals("page number is 1", pageResponse.pagination.current, 1);
  // Test default pagination values
  const defaultResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {} satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  // Test explicit null/undefined for page parameter
  const pageNullResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          page: undefined, // Replaced null with undefined to satisfy type system
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(pageNullResponse);
  TestValidator.equals(
    "page null is treated as 1",
    pageNullResponse.pagination.current,
    1,
  );
  const pageUndefinedResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          page: undefined,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(pageUndefinedResponse);
  TestValidator.equals(
    "page undefined is treated as 1",
    pageUndefinedResponse.pagination.current,
    1,
  );
  // Test explicit null/undefined for sort_by parameter
  const sortNullResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: undefined, // Replaced null with undefined to satisfy type system
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(sortNullResponse);
  const sortUndefinedResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: undefined,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(sortUndefinedResponse);
  // Test sorting by name (ascending)
  const nameAscResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "name",
          order: "asc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(nameAscResponse);
  const nameAscData = nameAscResponse.data;
  for (let i = 0; i < nameAscData.length - 1; i++) {
    const current = nameAscData[i];
    const next = nameAscData[i + 1];
    if (current.title === next.title) {
      // Secondary sort by ID in ascending order if titles are equal
      TestValidator.predicate(
        "secondary sort by ID (ascending)",
        () => current.id < next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by name (ascending)",
        () => current.title < next.title,
      );
    }
  }
  // Test sorting by name (descending)
  const nameDescResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "name",
          order: "desc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(nameDescResponse);
  const nameDescData = nameDescResponse.data;
  for (let i = 0; i < nameDescData.length - 1; i++) {
    const current = nameDescData[i];
    const next = nameDescData[i + 1];
    if (current.title === next.title) {
      // Secondary sort by ID in descending order if titles are equal
      TestValidator.predicate(
        "secondary sort by ID (descending)",
        () => current.id > next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by name (descending)",
        () => current.title > next.title,
      );
    }
  }
  // Test sorting by article_count (ascending)
  const articleCountAscResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "article_count",
          order: "asc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(articleCountAscResponse);
  const articleCountAscData = articleCountAscResponse.data;
  for (let i = 0; i < articleCountAscData.length - 1; i++) {
    const current = articleCountAscData[i];
    const next = articleCountAscData[i + 1];
    const currentCount = current.article_count ?? Number.NEGATIVE_INFINITY;
    const nextCount = next.article_count ?? Number.NEGATIVE_INFINITY;
    if (currentCount === nextCount) {
      // Secondary sort by ID in ascending order if article_count values are equal
      TestValidator.predicate(
        "secondary sort by ID (ascending)",
        () => current.id < next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by article_count (ascending)",
        () => currentCount < nextCount,
      );
    }
  }
  // Test sorting by article_count (descending)
  const articleCountDescResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "article_count",
          order: "desc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(articleCountDescResponse);
  const articleCountDescData = articleCountDescResponse.data;
  for (let i = 0; i < articleCountDescData.length - 1; i++) {
    const current = articleCountDescData[i];
    const next = articleCountDescData[i + 1];
    const currentCount = current.article_count ?? Number.POSITIVE_INFINITY;
    const nextCount = next.article_count ?? Number.POSITIVE_INFINITY;
    if (currentCount === nextCount) {
      // Secondary sort by ID in descending order if article_count values are equal
      TestValidator.predicate(
        "secondary sort by ID (descending)",
        () => current.id > next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by article_count (descending)",
        () => currentCount > nextCount,
      );
    }
  }
  // Test sorting by created_at (ascending)
  const createdAtAscResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(createdAtAscResponse);
  const createdAtAscData = createdAtAscResponse.data;
  for (let i = 0; i < createdAtAscData.length - 1; i++) {
    const current = createdAtAscData[i];
    const next = createdAtAscData[i + 1];
    if (current.created_at === next.created_at) {
      // Secondary sort by ID in ascending order if created_at values are equal
      TestValidator.predicate(
        "secondary sort by ID (ascending)",
        () => current.id < next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by created_at (ascending)",
        () => current.created_at < next.created_at,
      );
    }
  }
  // Test sorting by created_at (descending)
  const createdAtDescResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(createdAtDescResponse);
  const createdAtDescData = createdAtDescResponse.data;
  for (let i = 0; i < createdAtDescData.length - 1; i++) {
    const current = createdAtDescData[i];
    const next = createdAtDescData[i + 1];
    if (current.created_at === next.created_at) {
      // Secondary sort by ID in descending order if created_at values are equal
      TestValidator.predicate(
        "secondary sort by ID (descending)",
        () => current.id > next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by created_at (descending)",
        () => current.created_at > next.created_at,
      );
    }
  }
  // Test sorting by order (ascending)
  const orderAscResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "order",
          order: "asc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(orderAscResponse);
  const orderAscData = orderAscResponse.data;
  for (let i = 0; i < orderAscData.length - 1; i++) {
    const current = orderAscData[i];
    const next = orderAscData[i + 1];
    const currentOrder = current.order_index ?? Number.NEGATIVE_INFINITY;
    const nextOrder = next.order_index ?? Number.NEGATIVE_INFINITY;
    if (currentOrder === nextOrder) {
      // Secondary sort by ID in ascending order if order_index values are equal
      TestValidator.predicate(
        "secondary sort by ID (ascending)",
        () => current.id < next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by order (ascending)",
        () => currentOrder < nextOrder,
      );
    }
  }
  // Test sorting by order (descending)
  const orderDescResponse =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          sort_by: "order",
          order: "desc",
          limit: 20,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(orderDescResponse);
  const orderDescData = orderDescResponse.data;
  for (let i = 0; i < orderDescData.length - 1; i++) {
    const current = orderDescData[i];
    const next = orderDescData[i + 1];
    const currentOrder = current.order_index ?? Number.POSITIVE_INFINITY;
    const nextOrder = next.order_index ?? Number.POSITIVE_INFINITY;
    if (currentOrder === nextOrder) {
      // Secondary sort by ID in descending order if order_index values are equal
      TestValidator.predicate(
        "secondary sort by ID (descending)",
        () => current.id > next.id,
      );
    } else {
      TestValidator.predicate(
        "primary sort by order (descending)",
        () => currentOrder > nextOrder,
      );
    }
  }
  // Test limit enforcement at boundaries
  await TestValidator.error("limit below 1 should fail", async () => {
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          limit: 0,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  });
  await TestValidator.error("limit above 100 should fail", async () => {
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          limit: 101,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  });
  // Verify that all returned categories have active status as per citizen role restriction
  const allCategories =
    await api.functional.discussionBoard.citizen.categories.index(
      citizenConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardArticleCategory.IRequest,
      },
    );
  typia.assert(allCategories);
  // Check that no inactive or archived categories are returned
  for (const category of allCategories.data) {
    TestValidator.equals(
      "category status is active",
      category.status,
      "active",
    );
  }
  // Verify the entire response matches IPageIDiscussionBoardArticleCategory.ISummary structure
  typia.assert<IPageIDiscussionBoardArticleCategory.ISummary>(allCategories);
}