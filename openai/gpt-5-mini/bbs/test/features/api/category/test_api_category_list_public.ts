import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

export async function test_api_category_list_public(
  connection: api.IConnection,
) {
  // 1) Create moderator account (will set connection.headers.Authorization automatically)
  const moderatorInput = {
    username:
      RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
      RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorInput,
    });
  typia.assert(moderator);

  // 2) Create categories using moderator context
  const activeCategoryInput = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const inactiveCategoryInput = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph(),
    is_active: false,
  } satisfies IDiscussionBoardCategory.ICreate;

  // Create a category that we'll search for
  const searchToken = RandomGenerator.substring(RandomGenerator.paragraph());
  const searchCategoryInput = {
    name: `search-${searchToken}`,
    slug: `search-${RandomGenerator.alphabets(6)}`.toLowerCase(),
    description: RandomGenerator.paragraph(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const activeCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: activeCategoryInput,
      },
    );
  typia.assert(activeCategory);

  const inactiveCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: inactiveCategoryInput,
      },
    );
  typia.assert(inactiveCategory);

  const searchCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: searchCategoryInput,
      },
    );
  typia.assert(searchCategory);

  // 3) As unauthenticated client, list categories with default pagination
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const pageDefault: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(unauthConn, {
      body: {} satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(pageDefault);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination.current is a non-negative integer",
    typeof pageDefault.pagination.current === "number" &&
      pageDefault.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is a non-negative integer",
    typeof pageDefault.pagination.limit === "number" &&
      pageDefault.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is a non-negative integer",
    typeof pageDefault.pagination.records === "number" &&
      pageDefault.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is a non-negative integer",
    typeof pageDefault.pagination.pages === "number" &&
      pageDefault.pagination.pages >= 0,
  );

  // Ensure activeCategory is present and inactiveCategory is omitted by default
  TestValidator.predicate(
    "default listing contains created active category",
    ArrayUtil.has(pageDefault.data, (c) => c.id === activeCategory.id),
  );

  TestValidator.predicate(
    "default listing does not contain inactive (non-public) category",
    !ArrayUtil.has(pageDefault.data, (c) => c.id === inactiveCategory.id),
  );

  // 4) Filtering: request only active categories
  const pageActiveOnly: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(unauthConn, {
      body: { isActive: true } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(pageActiveOnly);

  TestValidator.predicate(
    "all returned categories are active",
    pageActiveOnly.data.every((d) => d.is_active === true),
  );

  TestValidator.predicate(
    "inactive category is not present in active-only listing",
    !ArrayUtil.has(pageActiveOnly.data, (c) => c.id === inactiveCategory.id),
  );

  // 5) Search: partial search using a substring of searchCategory.name
  const partial = searchCategory.name.substring(
    0,
    Math.min(8, searchCategory.name.length),
  );
  const pageSearch: IPageIDiscussionBoardCategory.ISummary =
    await api.functional.discussionBoard.categories.index(unauthConn, {
      body: { search: partial } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(pageSearch);

  TestValidator.predicate(
    `search results include category matching partial '${partial}'`,
    ArrayUtil.has(pageSearch.data, (c) => c.id === searchCategory.id),
  );

  // 6) Soft-delete semantics (adapted): since provided SDK does not expose a
  // delete endpoint, treat is_active=false as a proxy for non-public/archived
  // categories and confirm they are excluded by default (already validated above).

  // 7) Error handling: invalid pagination
  await TestValidator.error("limit > 100 should be rejected", async () => {
    await api.functional.discussionBoard.categories.index(unauthConn, {
      body: { limit: 101 } satisfies IDiscussionBoardCategory.IRequest,
    });
  });

  await TestValidator.error("page < 1 should be rejected", async () => {
    await api.functional.discussionBoard.categories.index(unauthConn, {
      body: { page: 0 } satisfies IDiscussionBoardCategory.IRequest,
    });
  });
}
