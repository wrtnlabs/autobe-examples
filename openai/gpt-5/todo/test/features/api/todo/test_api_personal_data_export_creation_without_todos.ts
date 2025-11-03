import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPersonalDataExportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPersonalDataExportStatus";
import type { ITodoTodoExportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoExportSnapshot";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserExportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserExportSnapshot";
import type { ITodoUserPersonalDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPersonalDataExport";

/**
 * Create personal data export for a new user with zero todos.
 *
 * Business goal:
 *
 * - A newly registered user (with no todos created yet) requests a personal data
 *   export. The system must create an export job and return export metadata.
 *   The composed artifact must include the user snapshot and an empty todos
 *   array.
 *
 * Test workflow:
 *
 * 1. Negative path: On an unauthenticated connection, POST export creation should
 *    fail (error expected; no specific HTTP code assertion).
 * 2. Join a brand-new user via /auth/user/join (SDK auto-attaches token).
 * 3. Call /todo/user/reports/personalData with optional flag.
 *
 * Validations:
 *
 * - Typia.assert() on all non-void responses.
 * - Export.user.id equals authenticated user id and email matches as well.
 * - Export.todos length is 0 (no todos created beforehand).
 * - If todos_count is provided, it equals 0 and equals todos.length.
 * - Ensure user snapshot excludes sensitive password_hash (property absence).
 */
export async function test_api_personal_data_export_creation_without_todos(
  connection: api.IConnection,
) {
  // 1) Negative path: unauthenticated request must be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated export creation is denied",
    async () => {
      await api.functional.todo.user.reports.personalData.create(unauthConn, {
        body: {
          include_overdue_flags: RandomGenerator.pick([true, false] as const),
        } satisfies ITodoUserPersonalDataExport.ICreate,
      });
    },
  );

  // 2) Join a new user to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d).{8,}$"> &
        tags.Format<"password">
    >(),
    href: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    referrer: "",
  } satisfies ITodoUser.IJoin;
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorized);

  // 3) Create a personal data export for the authenticated user
  const createBody = {
    include_overdue_flags: RandomGenerator.pick([true, false] as const),
  } satisfies ITodoUserPersonalDataExport.ICreate;
  const exportResult: ITodoUserPersonalDataExport =
    await api.functional.todo.user.reports.personalData.create(connection, {
      body: createBody,
    });
  typia.assert(exportResult);

  // Business validations
  TestValidator.equals(
    "export user id matches authenticated user id",
    exportResult.user.id,
    authorized.id,
  );
  TestValidator.equals(
    "export user email matches authenticated user email",
    exportResult.user.email,
    authorized.email,
  );
  TestValidator.equals(
    "export contains no todos for a fresh user",
    exportResult.todos.length,
    0,
  );
  if (exportResult.todos_count !== undefined) {
    TestValidator.equals(
      "todos_count equals zero when present",
      exportResult.todos_count,
      0,
    );
    TestValidator.equals(
      "todos_count equals todos.length",
      exportResult.todos_count,
      exportResult.todos.length,
    );
  }
  TestValidator.predicate(
    "user snapshot excludes password_hash",
    !("password_hash" in exportResult.user),
  );
}
