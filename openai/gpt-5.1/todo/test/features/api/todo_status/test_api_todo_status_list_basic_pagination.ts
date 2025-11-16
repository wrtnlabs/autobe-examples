import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoStatus";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate basic pagination behavior of the Todo status listing endpoint.
 *
 * This scenario focuses on the read-only catalogue endpoint PATCH
 * /todoApp/todoStatuses, ensuring that:
 *
 * 1. A todoAdmin can create multiple Todo status catalogue entries.
 * 2. The public list endpoint returns paginated summaries when requested with only
 *    `page` and `limit` fields in ITodoAppTodoStatus.IRequest.
 * 3. The `pagination` metadata reflects the requested paging parameters (1-based
 *    page -> 0-based `current`, and matching `limit`).
 * 4. The `data` array respects the requested `limit` and contains valid
 *    ITodoAppTodoStatus.ISummary objects.
 * 5. Multiple pages (page 1, page 2) together cover a consistent portion of the
 *    catalogue without duplicating items across pages.
 */
export async function test_api_todo_status_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a fresh todoAdmin to obtain an authenticated context.
  const adminJoinBody = typia.random<ITodoAppTodoAdminJoin.IRequest>();
  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // 2. Seed the Todo status catalogue with multiple entries.
  // Choose a limit that allows multiple pages.
  const pageSize = 5;
  const totalStatusesToCreate = 2 * pageSize + 1; // ensure more than 2 pages worth of data

  const indices: number[] = ArrayUtil.repeat(
    totalStatusesToCreate,
    (index) => index,
  );

  const createdStatuses: ITodoAppTodoStatus[] = await ArrayUtil.asyncMap(
    indices,
    async (index) => {
      // Ensure `code` uniqueness by embedding the index and a random suffix.
      const createBody = {
        code: `STATUS_${index}_${RandomGenerator.alphaNumeric(6)}`,
        label: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        group: RandomGenerator.paragraph({ sentences: 1 }),
        sort_order: index as number & tags.Type<"int32">,
        is_default: index === 0,
        is_active: index % 2 === 0,
      } satisfies ITodoAppTodoStatus.ICreate;

      const created: ITodoAppTodoStatus =
        await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
          body: createBody,
        });
      typia.assert<ITodoAppTodoStatus>(created);
      return created;
    },
  );

  TestValidator.equals<number, number>(
    "number of created statuses matches intended seed size",
    createdStatuses.length,
    totalStatusesToCreate,
  );

  // 3. Call the listing endpoint for page 1 with only page/limit.
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageSize as number & tags.Type<"int32">,
  } satisfies ITodoAppTodoStatus.IRequest;

  const page1: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: requestPage1,
    });
  typia.assert<IPageITodoAppTodoStatus.ISummary>(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  // 4. Validate pagination meta for page 1.
  TestValidator.equals<number, number>(
    "pagination.limit matches requested limit for page 1",
    pagination1.limit,
    requestPage1.limit,
  );

  TestValidator.equals<number, number>(
    "pagination.current is request page - 1 for page 1",
    pagination1.current,
    (requestPage1.page as number) - 1,
  );

  TestValidator.predicate(
    "page 1 data length does not exceed limit",
    page1.data.length <= requestPage1.limit,
  );

  // Ensure each summary entry looks valid (typia.assert already checked types).
  for (const summary of page1.data) {
    typia.assert<ITodoAppTodoStatus.ISummary>(summary);
    TestValidator.predicate(
      "summary.id should be a non-empty string",
      typeof summary.id === "string" && summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary.code should be non-empty",
      summary.code.length > 0,
    );
    TestValidator.predicate(
      "summary.label should be non-empty",
      summary.label.length > 0,
    );
  }

  // 5. Request page 2 and validate non-duplication and coverage.
  const requestPage2 = {
    page: 2 as number & tags.Type<"int32">,
    limit: pageSize as number & tags.Type<"int32">,
  } satisfies ITodoAppTodoStatus.IRequest;

  const page2: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: requestPage2,
    });
  typia.assert<IPageITodoAppTodoStatus.ISummary>(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  TestValidator.equals<number, number>(
    "pagination.limit matches requested limit for page 2",
    pagination2.limit,
    requestPage2.limit,
  );

  TestValidator.equals<number, number>(
    "pagination.current is request page - 1 for page 2",
    pagination2.current,
    (requestPage2.page as number) - 1,
  );

  TestValidator.predicate(
    "page 2 data length does not exceed limit",
    page2.data.length <= requestPage2.limit,
  );

  // Compare IDs across pages for non-duplication.
  const idsPage1 = new Set(page1.data.map((s) => s.id));
  const idsPage2 = new Set(page2.data.map((s) => s.id));

  const intersection = [...idsPage1].filter((id) => idsPage2.has(id));

  TestValidator.equals<string[], string[]>(
    "no duplicated status IDs between page 1 and page 2",
    intersection,
    [],
  );

  // 6. Cross-check pagination records/pages coherence.
  const observedUniqueIds = new Set<string>([...idsPage1, ...idsPage2]);

  TestValidator.predicate(
    "pagination.records is at least the number of unique items observed in first two pages",
    pagination1.records >= observedUniqueIds.size,
  );

  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination1.pages >= 0,
  );
}
