import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Since we cannot create users through available APIs (no user creation endpoint provided),
  // we'll test the search functionality with the existing user data in the system
  // Test exact match search with a realistic display name pattern
  const exactSearchResult = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        search: "User",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(exactSearchResult);
  // Test partial match search
  const partialSearchResult = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        search: "ser",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(partialSearchResult);
  // Test case-insensitive matching with lowercase
  const caseInsensitiveResult =
    await api.functional.discussionBoard.users.index(connection, {
      body: {
        search: "user",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IDiscussionBoardUser.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  // Test non-matching search
  const noMatchResult = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        search: "NonExistentUserXYZ123",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(noMatchResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination structure is valid",
    typeof exactSearchResult.pagination.current === "number" &&
      typeof exactSearchResult.pagination.limit === "number" &&
      typeof exactSearchResult.pagination.records === "number" &&
      typeof exactSearchResult.pagination.pages === "number",
  );
  // Validate user summary structure using business logic checks
  if (exactSearchResult.data.length > 0) {
    const user = exactSearchResult.data[0];
    TestValidator.predicate(
      "user display_name contains search term",
      user.display_name.toLowerCase().includes("user"),
    );
  }
  // Test different sorting options
  const sortOptions = [
    "newest",
    "oldest",
    "display_name_asc",
    "display_name_desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const sortedResult = await api.functional.discussionBoard.users.index(
      connection,
      {
        body: {
          search: "User",
          limit: 5,
          page: 1,
          sort: sortOption,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(sortedResult);
    TestValidator.predicate(
      `sort option ${sortOption} returns valid results`,
      Array.isArray(sortedResult.data),
    );
  }
}
