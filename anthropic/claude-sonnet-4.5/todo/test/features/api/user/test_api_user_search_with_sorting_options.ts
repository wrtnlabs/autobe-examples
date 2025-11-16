import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test different sorting capabilities for user lists including sorting by
 * created_at and email fields in both ascending and descending directions.
 *
 * This test validates that administrators can organize user lists according to
 * their preferences. It tests sorting by registration date (created_at) in both
 * ascending (oldest first) and descending (newest first) order. It tests
 * alphabetical sorting by email in both directions. Validates that the
 * order_direction parameter properly controls the sort direction. Verifies that
 * sorting works correctly when combined with filtering and pagination, ensuring
 * the sorted order is maintained across multiple pages. Tests default sorting
 * behavior when order_by is not specified.
 *
 * Test steps:
 *
 * 1. Authenticate as administrator
 * 2. Create multiple test users with varied registration dates and email addresses
 * 3. Test sorting by created_at in ascending order
 * 4. Test sorting by created_at in descending order
 * 5. Test sorting by email in ascending order (A-Z)
 * 6. Test sorting by email in descending order (Z-A)
 * 7. Test sorting with pagination to verify order is maintained across pages
 * 8. Test default sorting behavior when order_by is not specified
 */
export async function test_api_user_search_with_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
        href: "https://test.com" satisfies string & tags.Format<"uri">,
        referrer: "https://test.com" satisfies string & tags.Format<"uri">,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple test users with varied registration dates and email addresses
  const testUsers: ITodoListUser.IAuthorized[] = [];
  const emailPrefixes = [
    "alice",
    "bob",
    "charlie",
    "david",
    "eve",
    "frank",
    "grace",
    "henry",
  ] as const;

  for (let i = 0; i < 8; i++) {
    const userEmail = `${emailPrefixes[i]}${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}@test.com`;
    const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
      connection,
      {
        body: {
          email: userEmail,
          password: "password123",
          ip: "127.0.0.1",
          href: "https://test.com" satisfies string & tags.Format<"uri">,
          referrer: "https://test.com" satisfies string & tags.Format<"uri">,
        } satisfies ITodoListUser.ICreate,
      },
    );
    typia.assert(user);
    testUsers.push(user);

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Switch back to admin by creating a new admin session
  const adminReauth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        ip: "127.0.0.1",
        href: "https://test.com" satisfies string & tags.Format<"uri">,
        referrer: "https://test.com" satisfies string & tags.Format<"uri">,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(adminReauth);

  // Step 3: Test sorting by created_at in ascending order (oldest first)
  const sortedByCreatedAtAsc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "asc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedByCreatedAtAsc);

  for (let i = 0; i < sortedByCreatedAtAsc.data.length - 1; i++) {
    const current = new Date(sortedByCreatedAtAsc.data[i].created_at);
    const next = new Date(sortedByCreatedAtAsc.data[i + 1].created_at);
    TestValidator.predicate(
      "created_at ascending order is maintained",
      current <= next,
    );
  }

  // Step 4: Test sorting by created_at in descending order (newest first)
  const sortedByCreatedAtDesc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "desc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedByCreatedAtDesc);

  for (let i = 0; i < sortedByCreatedAtDesc.data.length - 1; i++) {
    const current = new Date(sortedByCreatedAtDesc.data[i].created_at);
    const next = new Date(sortedByCreatedAtDesc.data[i + 1].created_at);
    TestValidator.predicate(
      "created_at descending order is maintained",
      current >= next,
    );
  }

  // Step 5: Test sorting by email in ascending order (A-Z)
  const sortedByEmailAsc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        order_by: "email",
        order_direction: "asc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedByEmailAsc);

  for (let i = 0; i < sortedByEmailAsc.data.length - 1; i++) {
    const currentEmail = sortedByEmailAsc.data[i].email;
    const nextEmail = sortedByEmailAsc.data[i + 1].email;
    TestValidator.predicate(
      "email ascending order is maintained",
      currentEmail.localeCompare(nextEmail) <= 0,
    );
  }

  // Step 6: Test sorting by email in descending order (Z-A)
  const sortedByEmailDesc: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        order_by: "email",
        order_direction: "desc",
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(sortedByEmailDesc);

  for (let i = 0; i < sortedByEmailDesc.data.length - 1; i++) {
    const currentEmail = sortedByEmailDesc.data[i].email;
    const nextEmail = sortedByEmailDesc.data[i + 1].email;
    TestValidator.predicate(
      "email descending order is maintained",
      currentEmail.localeCompare(nextEmail) >= 0,
    );
  }

  // Step 7: Test sorting with pagination to verify order is maintained across pages
  const page1: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 1,
        limit: 3,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(page1);

  const page2: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        page: 2,
        limit: 3,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(page2);

  if (page1.data.length > 0 && page2.data.length > 0) {
    const lastOfPage1 = new Date(page1.data[page1.data.length - 1].created_at);
    const firstOfPage2 = new Date(page2.data[0].created_at);
    TestValidator.predicate(
      "sorting order is maintained across pages",
      lastOfPage1 <= firstOfPage2,
    );
  }

  // Step 8: Test default sorting behavior when order_by is not specified
  const defaultSort: IPageITodoListUser.ISummary =
    await api.functional.todoList.admin.users.index(connection, {
      body: {
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    });
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sorting returns results",
    defaultSort.data.length > 0,
  );
}
