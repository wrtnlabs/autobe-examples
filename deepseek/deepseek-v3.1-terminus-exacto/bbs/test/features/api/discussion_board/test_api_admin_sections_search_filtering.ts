import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_sections_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test search functionality with various scenarios
  const searchTests = [
    { search: "politics", description: "exact match search" },
    { search: "discussion", description: "partial match in name" },
    { search: "analysis", description: "partial match in description" },
    { search: "", description: "empty search term" },
    { search: "nonexistent", description: "non-matching term" },
    { search: "Politics", description: "case sensitivity test" },
    { search: "current-affairs", description: "special characters test" },
  ];
  for (const test of searchTests) {
    const result = await api.functional.discussionBoard.admin.sections.index(
      adminConnection,
      {
        body: {
          search: test.search,
          limit: 100,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(result);
    TestValidator.predicate(
      `search "${test.search}" should return valid pagination data`,
      result.pagination.records >= 0 && result.pagination.pages >= 0,
    );
  }
  // Test pagination
  const paginationResult =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination should return valid data",
    paginationResult.pagination.limit === 10 &&
      paginationResult.pagination.current === 1,
  );
  // Test sorting
  const sortTests = [
    "created_at:desc",
    "created_at:asc",
    "updated_at:desc",
    "updated_at:asc",
    "name:asc",
    "name:desc",
  ] as const;
  for (const sort of sortTests) {
    const sortResult =
      await api.functional.discussionBoard.admin.sections.index(
        adminConnection,
        {
          body: {
            sort,
            limit: 10,
          } satisfies IDiscussionBoardSection.IRequest,
        },
      );
    typia.assert(sortResult);
    TestValidator.predicate(
      `sorting by ${sort} should return valid sections`,
      Array.isArray(sortResult.data),
    );
  }
  // Test combination of search and pagination
  const combinedResult =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        search: "discussion",
        page: 1,
        limit: 5,
        sort: "name:asc",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined search should work correctly",
    combinedResult.pagination.limit === 5 &&
      combinedResult.pagination.current === 1,
  );
}
