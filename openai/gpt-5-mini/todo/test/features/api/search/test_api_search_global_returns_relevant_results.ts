import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSearchResult";
import type { ITodoAppGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGlobalSearch";
import type { ITodoAppList } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppList";
import type { ITodoAppSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSearchResult";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_search_global_returns_relevant_results(
  connection: api.IConnection,
) {
  // 1) Create a new todoUser account and obtain its token via join
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: "P@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    displayName: RandomGenerator.name(),
    ip: undefined,
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // At this point, SDK attaches Authorization header to connection automatically

  // 2) Create canonical tags: "groceries" and "workflows"
  const groceriesTag: ITodoAppTaskTag =
    await api.functional.todoApp.todoUser.taskTags.create(connection, {
      body: { name: "groceries" } satisfies ITodoAppTaskTag.ICreate,
    });
  typia.assert(groceriesTag);

  const workflowsTag: ITodoAppTaskTag =
    await api.functional.todoApp.todoUser.taskTags.create(connection, {
      body: { name: "workflows" } satisfies ITodoAppTaskTag.ICreate,
    });
  typia.assert(workflowsTag);

  // 3) Create two lists: public and private
  const publicList: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: {
        title: `Public - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        description: RandomGenerator.paragraph({ sentences: 6 }),
        visibility: "public",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(publicList);

  const privateList: ITodoAppList =
    await api.functional.todoApp.todoUser.lists.create(connection, {
      body: {
        title: `Private - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        visibility: "private",
      } satisfies ITodoAppList.ICreate,
    });
  typia.assert(privateList);

  // 4) Create several tasks under each list with tags and varied fields
  const createdTaskIds: string[] = [];

  // Tasks for public list
  const publicTask1: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: publicList.id,
      body: {
        title: "Buy groceries",
        description: "Milk, eggs, bread",
        isCompleted: false,
        dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        tagNames: ["groceries"],
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(publicTask1);
  createdTaskIds.push(publicTask1.id);

  const publicTask2: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: publicList.id,
      body: {
        title: "Project workflows review",
        description: RandomGenerator.content({ paragraphs: 1 }),
        isCompleted: true,
        dueDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        tagNames: ["workflows"],
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(publicTask2);
  createdTaskIds.push(publicTask2.id);

  // Tasks for private list
  const privateTask1: ITodoAppTask =
    await api.functional.todoApp.todoUser.lists.tasks.create(connection, {
      listId: privateList.id,
      body: {
        title: "Grocery budget planning",
        description: "Plan weekly groceries",
        isCompleted: false,
        dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        tagNames: ["groceries", "workflows"],
      } satisfies ITodoAppTask.ICreate,
    });
  typia.assert(privateTask1);
  createdTaskIds.push(privateTask1.id);

  // 5) Call global search with query 'groceries' and validate results
  const searchRequest = {
    query: "groceries",
    page: 1,
    pageSize: 10,
    entityFilters: ["task", "list", "tag", "user"],
    includeSnippets: true,
    restrictToAccessible: true,
    sortBy: "relevance",
    order: "desc",
  } satisfies ITodoAppGlobalSearch.IRequest;

  const searchResult: IPageITodoAppSearchResult.ISummary =
    await api.functional.todoApp.todoUser.search.global.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Basic pagination shape checks
  TestValidator.predicate(
    "pagination.current is number",
    typeof searchResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination.limit is number",
    typeof searchResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination.records is number",
    typeof searchResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination.pages is number",
    typeof searchResult.pagination.pages === "number",
  );

  // Ensure returned items have discriminator and essential fields
  TestValidator.predicate(
    "every result has targetType and targetId",
    searchResult.data.every(
      (d) => typeof d.targetType === "string" && typeof d.targetId === "string",
    ),
  );

  // Ensure at least one returned result corresponds to created resources (tasks/lists/tags)
  const returnedIds = searchResult.data.map((d) => d.targetId);
  const intersectsCreated = returnedIds.some(
    (id) =>
      createdTaskIds.includes(id) ||
      id === groceriesTag.id ||
      id === publicList.id ||
      id === privateList.id,
  );
  TestValidator.predicate(
    "search hits include created resources",
    intersectsCreated,
  );

  // 6) Pagination & sorting stability: request a small page size and ensure consistent pagination structure
  const pagedRequest = {
    ...searchRequest,
    page: 1,
    pageSize: 2,
    sortBy: "createdAt",
    order: "desc",
  } satisfies ITodoAppGlobalSearch.IRequest;
  const paged: IPageITodoAppSearchResult.ISummary =
    await api.functional.todoApp.todoUser.search.global.index(connection, {
      body: pagedRequest,
    });
  typia.assert(paged);
  TestValidator.predicate("paged returns array", Array.isArray(paged.data));
  TestValidator.predicate(
    "paged limit equals requested pageSize",
    paged.pagination.limit === 2,
  );

  // 7) Error cases
  // 7a) Unauthenticated caller should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated search should fail", async () => {
    await api.functional.todoApp.todoUser.search.global.index(unauthConn, {
      body: {
        query: "groceries",
        page: 1,
        pageSize: 10,
      } satisfies ITodoAppGlobalSearch.IRequest,
    });
  });

  // 7b) Malformed pagination (page = 0) should be rejected with 400
  await TestValidator.error("invalid pagination page should fail", async () => {
    await api.functional.todoApp.todoUser.search.global.index(connection, {
      body: { page: 0, pageSize: 10 } satisfies ITodoAppGlobalSearch.IRequest,
    });
  });

  // All done
}
