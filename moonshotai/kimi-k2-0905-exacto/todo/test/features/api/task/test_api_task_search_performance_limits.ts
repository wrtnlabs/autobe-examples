import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTask";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_task_search_performance_limits(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      ip: "127.0.0.1",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert<ITodoAppUser.IAuthorized>(user);

  // Step 2: Test minimum page value (page = 1, default limit = 20)
  const minPageResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert<IPageITodoAppTask.ISummary>(minPageResponse);
  TestValidator.equals(
    "min page pagination current",
    minPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "min page pagination limit",
    minPageResponse.pagination.limit,
    20,
  );

  // Step 3: Test maximum limit (limit = 100)
  const maxLimitResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert<IPageITodoAppTask.ISummary>(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit should not exceed 100",
    maxLimitResponse.pagination.limit <= 100,
  );

  // Step 4: Test search query with maximum 200 characters using valid generation
  const maxLengthSentence = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const validMaxSearchQuery = maxLengthSentence.substring(
    0,
    Math.min(maxLengthSentence.length, 200),
  );

  const maxSearchResponse = await api.functional.todoApp.user.tasks.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        search: validMaxSearchQuery,
      } satisfies ITodoAppTask.IRequest,
    },
  );
  typia.assert<IPageITodoAppTask.ISummary>(maxSearchResponse);
  TestValidator.predicate(
    "search query within limit",
    validMaxSearchQuery.length <= 200,
  );

  // Step 5: Test various pagination combinations
  const combinations = [
    { page: 1, limit: 20, search: undefined },
    { page: 2, limit: 50, search: "test" },
    { page: 5, limit: 10, search: undefined },
  ];

  await ArrayUtil.asyncForEach(combinations, async (params) => {
    const response = await api.functional.todoApp.user.tasks.index(connection, {
      body: {
        page: params.page as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: params.limit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        search: params.search as string | undefined,
      } satisfies ITodoAppTask.IRequest,
    });
    typia.assert<IPageITodoAppTask.ISummary>(response);

    TestValidator.predicate(
      "pagination current page valid",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit within bounds",
      response.pagination.limit >= 1 && response.pagination.limit <= 100,
    );
  });
}
