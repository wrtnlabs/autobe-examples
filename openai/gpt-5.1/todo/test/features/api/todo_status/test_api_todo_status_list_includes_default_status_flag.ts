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
 * Verify that the Todo status list exposes the `is_default` flag correctly and
 * that, when the catalogue is configured with exactly one default status, the
 * listing reflects exactly one summary entry as default.
 *
 * Business flow:
 *
 * 1. A new todoAdmin joins the system via `/auth/todoAdmin/join` so that
 *    privileged admin endpoints can be invoked.
 * 2. The admin creates multiple Todo status catalogue entries via
 *    `/todoApp/todoAdmin/todoStatuses`, configuring exactly one as default
 *    (`is_default = true`) and others as non-default (`is_default = false`).
 * 3. The public listing endpoint `/todoApp/todoStatuses` is called with pagination
 *    and active-only filter to retrieve the status summaries.
 * 4. The response is asserted to be a valid page and the `data` collection is
 *    inspected to ensure exactly one status has `is_default === true`, matching
 *    the configured catalogue state.
 */
export async function test_api_todo_status_list_includes_default_status_flag(
  connection: api.IConnection,
) {
  // 1. Register (join) a todoAdmin account to obtain admin privileges.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo.example.com/admin/join",
    referrer: "https://todo.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create multiple Todo status entries, exactly one with is_default = true.
  const baseCodePrefix = RandomGenerator.alphaNumeric(8).toUpperCase();

  const defaultStatusBody = {
    code: `${baseCodePrefix}_DEFAULT`,
    label: "Default Status",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const nonDefaultStatusBody1 = {
    code: `${baseCodePrefix}_ALT1`,
    label: "Alt Status 1",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 2 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const nonDefaultStatusBody2 = {
    code: `${baseCodePrefix}_ALT2`,
    label: "Alt Status 2",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 3 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdDefault: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: defaultStatusBody,
    });
  typia.assert(createdDefault);

  const createdAlt1: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: nonDefaultStatusBody1,
    });
  typia.assert(createdAlt1);

  const createdAlt2: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: nonDefaultStatusBody2,
    });
  typia.assert(createdAlt2);

  // 3. List Todo statuses with pagination and active-only filter.
  const listBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    query: undefined,
    isActiveOnly: true,
    sortKey: "sort_order" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const pageResult: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: listBody,
    });
  typia.assert(pageResult);

  // 4. Validate pagination shape and default flag semantics.
  const pagination = pageResult.pagination;
  const summaries = pageResult.data;

  TestValidator.predicate(
    "pagination records should be at least number of created statuses",
    pagination.records >= 3,
  );
  TestValidator.predicate(
    "data length should be at least number of created statuses on first page",
    summaries.length >= 3,
  );

  const defaultSummaries = summaries.filter((s) => s.is_default === true);

  TestValidator.equals(
    "exactly one default status should appear in list",
    defaultSummaries.length,
    1,
  );

  const defaultSummary = defaultSummaries[0];
  if (defaultSummary !== undefined) {
    TestValidator.equals(
      "default summary code should match created default status code",
      defaultSummary.code,
      createdDefault.code,
    );
  }
}
