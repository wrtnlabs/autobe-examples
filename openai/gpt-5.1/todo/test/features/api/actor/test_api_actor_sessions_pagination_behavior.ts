import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppActorSession";
import type { ITodoAppActorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSession";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate pagination behavior of unified actor session search for todoAdmin.
 *
 * 1. Create multiple todoAdmin accounts using /auth/todoAdmin/join to ensure
 *    multiple admin sessions exist in the system.
 * 2. As an admin, call PATCH /todoApp/todoAdmin/actors/sessions with a small limit
 *    (e.g., 2) and page=1, filtered to actor_type="admin".
 * 3. Assert that pagination metadata (limit, records, pages, current) is
 *    consistent with expectations and that the returned data length respects
 *    the limit and is non-zero.
 * 4. Call the same endpoint again with page=2 and the same limit and filters.
 * 5. When at least two pages exist, confirm that the second page has a different
 *    slice of session IDs than the first page and that actorType is
 *    consistently "admin" across records.
 */
export async function test_api_actor_sessions_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Create multiple todoAdmin accounts to ensure multiple admin sessions
  const adminJoinCount = 5;
  for (let i = 0; i < adminJoinCount; i++) {
    const joinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://admin.todo.example.com/register",
      referrer: "https://todo.example.com/landing",
    } satisfies ITodoAppTodoAdminJoin.IRequest;

    const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
      await api.functional.auth.todoAdmin.join(connection, {
        body: joinBody,
      });
    typia.assert(adminAuthorized);
  }

  // 2. Query actor sessions page 1 with small limit for admin sessions only
  const limit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const page1Request = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    actor_type: "admin",
  } satisfies ITodoAppActorSession.IRequest;

  const page1: IPageITodoAppActorSession.ISummary =
    await api.functional.todoApp.todoAdmin.actors.sessions.index(connection, {
      body: page1Request,
    });
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // 3. Validate pagination metadata for page 1
  TestValidator.equals(
    "page1 limit matches requested limit",
    pagination1.limit,
    limit,
  );

  TestValidator.predicate(
    "page1 records count covers returned data length",
    pagination1.records >= data1.length,
  );

  TestValidator.predicate(
    "page1 data length is positive and within limit",
    data1.length > 0 && data1.length <= pagination1.limit,
  );

  TestValidator.predicate(
    "page1 pages is non-negative",
    pagination1.pages >= 0,
  );

  // current is zero-based index; requesting page=1 should give current=0
  TestValidator.equals(
    "page1 current index is zero-based for first page",
    pagination1.current,
    0,
  );

  // Actor type consistency for page 1
  for (const session of data1) {
    TestValidator.equals(
      "page1 session actorType should be admin",
      session.actorType,
      "admin",
    );
  }

  // 4. Query actor sessions page 2 with the same limit and filter
  const page2Request = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    actor_type: "admin",
  } satisfies ITodoAppActorSession.IRequest;

  const page2: IPageITodoAppActorSession.ISummary =
    await api.functional.todoApp.todoAdmin.actors.sessions.index(connection, {
      body: page2Request,
    });
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  TestValidator.equals(
    "page2 limit matches requested limit",
    pagination2.limit,
    limit,
  );

  TestValidator.predicate(
    "page2 records count covers returned data length",
    pagination2.records >= data2.length,
  );

  TestValidator.predicate(
    "page2 pages is non-negative",
    pagination2.pages >= 0,
  );

  // If there are at least 2 pages, current for page=2 should be 1
  if (pagination2.pages >= 2) {
    TestValidator.equals(
      "page2 current index is one for second page",
      pagination2.current,
      1,
    );
  }

  TestValidator.predicate(
    "page2 data length is within limit (may be zero on last page)",
    data2.length <= pagination2.limit,
  );

  // Actor type consistency for page 2
  for (const session of data2) {
    TestValidator.equals(
      "page2 session actorType should be admin",
      session.actorType,
      "admin",
    );
  }

  // 5. Compare slices when there are at least two pages and enough records
  if (pagination1.pages >= 2 && pagination1.records > limit) {
    const ids1 = data1.map((s) => s.id);
    const ids2 = data2.map((s) => s.id);

    // Ensure the page slices are not identical
    TestValidator.notEquals(
      "page1 and page2 ID lists should not be identical",
      ids1,
      ids2,
    );

    // Ensure there is at least one ID that differs between the two pages
    const hasDifference =
      ids1.some((id) => !ids2.includes(id)) ||
      ids2.some((id) => !ids1.includes(id));

    TestValidator.predicate(
      "page1 and page2 have at least one differing session ID",
      hasDifference,
    );
  }
}
