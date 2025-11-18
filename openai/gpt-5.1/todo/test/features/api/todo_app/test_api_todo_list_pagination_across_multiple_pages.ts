import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_list_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Admin registration and implicit authentication
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "Admin1234!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a harmless system setting that could conceptually influence limits
  const systemSettingBody = {
    key: `pagination_test_max_page_size_${RandomGenerator.alphaNumeric(8)}`,
    value: "50",
    type: "int",
    description: "Max page size for pagination E2E test (non-enforced demo)",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Member user registration (auto-auth via join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "Member1234!" as string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1" as string & (tags.Format<"ipv4"> | tags.Format<"ipv6">),
    href: "https://todoapp.test/join",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create more todos than a single page can contain
  const pageLimit = 10;
  const createCount = 25;

  const createdTodoIds: string[] = [];

  for (let i = 0; i < createCount; i++) {
    const createBody = {
      title: `pagination-test-${i}-${RandomGenerator.paragraph({
        sentences: 1,
      })}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      due_date: null,
      state: "active",
    } satisfies ITodoAppTodo.ICreate;

    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: createBody,
      });
    typia.assert(todo);
    createdTodoIds.push(todo.id);
  }

  // Helper to fetch a page
  const fetchPage = async (
    page: number & tags.Type<"int32">,
  ): Promise<IPageITodoAppTodo.ISummary> => {
    const body = {
      page,
      limit: pageLimit as number & tags.Type<"int32">,
      search: null,
      state: null,
      createdFrom: null,
      createdTo: null,
      dueFrom: null,
      dueTo: null,
      completed: null,
    } satisfies ITodoAppTodo.IRequest;

    const pageResult: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.memberUser.todos.index(connection, {
        body,
      });
    typia.assert(pageResult);
    return pageResult;
  };

  // 5. Page 0
  const page0 = await fetchPage(0 as number & tags.Type<"int32">);
  const pagination0 = page0.pagination;

  TestValidator.equals("page 0: current page index", pagination0.current, 0);
  TestValidator.equals("page 0: limit", pagination0.limit, pageLimit);
  TestValidator.predicate(
    "page 0: records should be at least created count",
    pagination0.records >= createCount,
  );
  TestValidator.predicate(
    "page 0: pages should be positive",
    pagination0.pages > 0,
  );
  TestValidator.equals(
    "page 0: data length should not exceed limit",
    page0.data.length,
    Math.min(pageLimit, pagination0.records),
  );

  const page0Ids = page0.data.map((todo) => todo.id);

  // 6. Page 1
  const page1 = await fetchPage(1 as number & tags.Type<"int32">);
  const pagination1 = page1.pagination;

  TestValidator.equals("page 1: current page index", pagination1.current, 1);
  TestValidator.equals("page 1: limit", pagination1.limit, pageLimit);
  TestValidator.predicate(
    "page 1: records should be consistent with page 0",
    pagination1.records === pagination0.records,
  );
  TestValidator.predicate(
    "page 1: pages should be consistent with page 0",
    pagination1.pages === pagination0.pages,
  );
  TestValidator.equals(
    "page 1: data length should not exceed limit",
    page1.data.length,
    Math.min(pageLimit, pagination1.records - pageLimit),
  );

  const page1Ids = page1.data.map((todo) => todo.id);

  // Non-overlap between page 0 and 1
  const overlap01 = page0Ids.filter((id) => page1Ids.includes(id));
  TestValidator.equals(
    "page 0 and 1: no overlapping todo IDs",
    overlap01.length,
    0,
  );

  // 7. Page 2
  const page2 = await fetchPage(2 as number & tags.Type<"int32">);
  const pagination2 = page2.pagination;

  TestValidator.equals("page 2: current page index", pagination2.current, 2);
  TestValidator.equals("page 2: limit", pagination2.limit, pageLimit);
  TestValidator.predicate(
    "page 2: records consistent across pages",
    pagination2.records === pagination0.records,
  );
  TestValidator.predicate(
    "page 2: pages consistent across pages",
    pagination2.pages === pagination0.pages,
  );

  const page2Ids = page2.data.map((todo) => todo.id);

  // Ensure no overlap across pages 0, 1, 2
  const overlap02 = page0Ids.filter((id) => page2Ids.includes(id));
  const overlap12 = page1Ids.filter((id) => page2Ids.includes(id));

  TestValidator.equals(
    "page 0 and 2: no overlapping todo IDs",
    overlap02.length,
    0,
  );
  TestValidator.equals(
    "page 1 and 2: no overlapping todo IDs",
    overlap12.length,
    0,
  );

  // 8. Request a page index beyond the last page and verify behavior
  const lastPageIndex = pagination0.pages;

  const beyondPage = await fetchPage(
    lastPageIndex as number & tags.Type<"int32">,
  );
  const beyondPagination = beyondPage.pagination;

  TestValidator.equals(
    "beyond last: current page index should match requested index",
    beyondPagination.current,
    lastPageIndex,
  );
  TestValidator.equals(
    "beyond last: limit should match page limit",
    beyondPagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "beyond last: pages should remain consistent",
    beyondPagination.pages,
    pagination0.pages,
  );
  TestValidator.equals(
    "beyond last: records should remain consistent",
    beyondPagination.records,
    pagination0.records,
  );
  TestValidator.equals(
    "beyond last: data array should be empty or very small if pages just increased",
    beyondPage.data.length,
    0,
  );
}
