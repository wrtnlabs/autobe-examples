import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_search_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create admin account and obtain authorization (SDK will inject token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123",
      is_super: true,
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create two distinct user accounts to ensure search returns meaningful results
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail1,
      password: "UserPass123",
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user1);

  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail2,
      password: "UserPass123",
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user2);

  // 3. Prepare search criteria: use a substring of userEmail1's local-part for emailLike
  const localPart = userEmail1.split("@")[0] ?? userEmail1;
  const emailLike = localPart.slice(0, Math.min(6, localPart.length));

  // 4. As authenticated admin (token set by admin.join), call the admin users index endpoint
  const page: IPageITodoAppUser.ISummary =
    await api.functional.todoApp.admin.users.index(connection, {
      body: {
        page: 1,
        pageSize: 10,
        emailLike,
        sortBy: "created_at",
        order: "desc",
      } satisfies ITodoAppUser.IRequest,
    });
  typia.assert(page);

  // 5. Validate pagination metadata and content
  TestValidator.predicate(
    "response contains pagination metadata",
    page.pagination !== undefined,
  );
  TestValidator.equals(
    "page size equals requested limit",
    page.pagination.limit,
    10,
  );
  // Accept either 0-based or 1-based current page implementations
  TestValidator.predicate(
    "page number is non-negative",
    page.pagination.current >= 0,
  );

  // 6. Validate that returned data includes at least one of the created users
  TestValidator.predicate(
    "returned data includes one of created user emails",
    Array.isArray(page.data) &&
      (page.data.map((d) => d.email).includes(userEmail1) ||
        page.data.map((d) => d.email).includes(userEmail2)),
  );

  // 7. Validate item shape and presence of summary fields for the first item (if exists)
  if (Array.isArray(page.data) && page.data.length > 0) {
    const first = page.data[0];
    typia.assert(first);
    TestValidator.predicate(
      "first item has id",
      typeof first.id === "string" && first.id.length > 0,
    );
    TestValidator.predicate(
      "first item has email",
      typeof first.email === "string" && first.email.includes("@"),
    );
    TestValidator.predicate(
      "first item has account_status",
      typeof first.account_status === "string",
    );
    TestValidator.predicate(
      "first item has created_at",
      typeof first.created_at === "string",
    );
  }

  // 8. Validate sorting by created_at descending (if more than one item returned)
  if (Array.isArray(page.data) && page.data.length > 1) {
    const isDesc = page.data.every((elem, i, arr) => {
      if (i === 0) return true;
      const prev = new Date(arr[i - 1].created_at).getTime();
      const curr = new Date(elem.created_at).getTime();
      return prev >= curr;
    });
    TestValidator.predicate("items are sorted by created_at desc", isDesc);
  }
}
