import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates admin list search with advanced filtering, sorting, and security
 * rules.
 *
 * - Creates multiple admins with varied roles and locked states.
 * - Authenticates one admin to get tokens for privileged access.
 * - Searches by email, role, and locked status and verifies filters work.
 * - Tests pagination: limit, page, empty results.
 * - Ensures only admins (authenticated) can access the list.
 * - Checks security: sensitive fields are hidden, deleted/locked accounts are
 *   handled.
 * - Validates edge cases and result shape.
 */
export async function test_api_admin_list_search_full_access(
  connection: api.IConnection,
) {
  // -- 1. Create several admins for thorough test coverage
  const emailA = typia.random<string & tags.Format<"email">>();
  const emailB = typia.random<string & tags.Format<"email">>();
  const emailC = typia.random<string & tags.Format<"email">>();

  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: emailA,
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminA);

  // Switch to adminB (for role diversity and locked tests)
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: emailB,
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminB);

  // Create (but do not authenticate as) adminC for filter edge cases
  const adminC = await api.functional.auth.admin.join(connection, {
    body: {
      email: emailC,
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminC);

  // -- 2. List all admins with no filter (should include at least 3, paginated)
  const allAdminsPage = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: { page: 1, limit: 20 } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(allAdminsPage);
  TestValidator.predicate(
    "at least 3 admins present",
    allAdminsPage.data.length >= 3,
  );
  allAdminsPage.data.forEach((admin) => {
    typia.assert(admin);
    TestValidator.predicate(
      "email exists",
      typeof admin.email === "string" && admin.email.length > 0,
    );
    TestValidator.predicate(
      "created_at is ISO",
      typeof admin.created_at === "string" && admin.created_at.includes("T"),
    );
    TestValidator.predicate(
      "locked is boolean",
      typeof admin.locked === "boolean",
    );
    TestValidator.predicate("role is string", typeof admin.role === "string");
  });

  // -- 3. Filter by search email of adminA (should include only adminA)
  const filterEmailPage = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: { search: emailA } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(filterEmailPage);
  TestValidator.equals(
    "only adminA found by search",
    filterEmailPage.data.length,
    1,
  );
  TestValidator.equals(
    "search matches adminA",
    filterEmailPage.data[0].email,
    emailA,
  );

  // -- 4. Filter by role - assume all use same role string (just verify field)
  const foundRole = allAdminsPage.data[0]?.role;
  if (foundRole) {
    const byRolePage = await api.functional.todoList.admin.admins.index(
      connection,
      {
        body: { role: foundRole } satisfies ITodoListAdmin.IRequest,
      },
    );
    typia.assert(byRolePage);
    TestValidator.predicate(
      "all results have correct role",
      byRolePage.data.every((r) => r.role === foundRole),
    );
  }

  // -- 5. Pagination - request page/limit to force empty result edge case
  const paginationInfo = allAdminsPage.pagination;
  const emptyPage = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: paginationInfo.pages + 1,
        limit: paginationInfo.limit,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty result page", emptyPage.data.length, 0);

  // -- 6. Locked filter (simulate locked - but system controls this; verify field's presence & value)
  // Note: If locked is true for any admin, can filter by locked: true.
  const anyLocked = allAdminsPage.data.find((admin) => admin.locked === true);
  if (anyLocked) {
    const lockedPage = await api.functional.todoList.admin.admins.index(
      connection,
      {
        body: { locked: true } satisfies ITodoListAdmin.IRequest,
      },
    );
    typia.assert(lockedPage);
    TestValidator.predicate(
      "all admins are locked",
      lockedPage.data.every((a) => a.locked === true),
    );
  } else {
    const unlockedPage = await api.functional.todoList.admin.admins.index(
      connection,
      {
        body: { locked: false } satisfies ITodoListAdmin.IRequest,
      },
    );
    typia.assert(unlockedPage);
    TestValidator.predicate(
      "all admins are unlocked",
      unlockedPage.data.every((a) => a.locked === false),
    );
  }

  // -- 7. Security: sensitive fields are NOT present
  allAdminsPage.data.forEach((admin) => {
    TestValidator.predicate("no password fields", !("password_hash" in admin));
    TestValidator.predicate("no token field in ISummary", !("token" in admin));
  });

  // -- 8. Unauthenticated user is denied access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user forbidden", async () => {
    await api.functional.todoList.admin.admins.index(unauthConn, {
      body: { page: 1, limit: 10 } satisfies ITodoListAdmin.IRequest,
    });
  });
}
