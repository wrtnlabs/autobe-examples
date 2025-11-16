import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test a registered user can retrieve a paginated, filtered list of their own
 * active sessions.
 *
 * 1. Register a new user (join endpoint)
 * 2. Authenticate as that user (token management is handled internally by the SDK
 *    after join)
 * 3. List user sessions using the authenticated context:
 *
 *    - Call the PATCH /todoList/user/users/{userId}/sessions API for that user's
 *         UUID
 *    - Provide at least the default page/limit values in
 *         ITodoListUserSession.IRequest, and test also with custom pagination
 *         and optional filter parameters (filterIp, filterHref,
 *         filterReferrer)
 *    - All results MUST have user.id matching the logged-in user and expose only the
 *         allowed summary fields (id, ip, href, referrer, created_at,
 *         expired_at)
 * 4. Check that response shape is correct: pagination is valid, all data rows are
 *    ISummary objects, and no sensitive fields (password, raw token, etc.) are
 *    leaked
 * 5. Test edge: Call with filter values that yield zero sessions, verify empty
 *    list
 * 6. Test edge: Call with extreme pagination (high out-of-bounds page), verify
 *    empty or proper response
 * 7. (Optional) If practical, validate sorting by created_at asc/desc
 */
export async function test_api_user_list_sessions_self_service(
  connection: api.IConnection,
) {
  // 1. Register user
  const userInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);

  // 2. Extract userId
  const userId = userAuth.id;

  // 3. List user sessions with default pagination
  const defaultList = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId,
      body: {
        page: 1 as number &
          tags.Type<"int32"> &
          tags.Default<1> &
          tags.Minimum<1>,
        limit: 20 as number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(defaultList);
  TestValidator.equals(
    "response is a valid sessions page for the logged-in user",
    defaultList.pagination.current,
    1,
  );
  if (defaultList.data.length > 0) {
    // Validate that all session records are for this user and have required fields
    for (const row of defaultList.data) {
      typia.assert(row);
      TestValidator.equals(
        "session user matches logged-in user",
        row.user.id,
        userId,
      );
      TestValidator.predicate(
        "session id is non-empty",
        typeof row.id === "string" && row.id.length > 0,
      );
      TestValidator.predicate(
        "session ip is string",
        typeof row.ip === "string",
      );
      TestValidator.predicate(
        "session href is string",
        typeof row.href === "string",
      );
      TestValidator.predicate(
        "session referrer is string",
        typeof row.referrer === "string",
      );
      TestValidator.predicate(
        "session created_at is non-empty string",
        typeof row.created_at === "string" && row.created_at.length > 0,
      );
      // Expired_at may be undefined or null
      if (row.expired_at !== null && row.expired_at !== undefined)
        TestValidator.predicate(
          "expired_at is non-empty string",
          typeof row.expired_at === "string" && row.expired_at.length > 0,
        );
    }
  }

  // 4. List with custom pagination (limit 5, page 1)
  const page1 = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId,
      body: {
        page: 1 as number &
          tags.Type<"int32"> &
          tags.Default<1> &
          tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 page index", page1.pagination.current, 1);
  TestValidator.equals(
    "limit in pagination matches request",
    page1.pagination.limit,
    5,
  );

  // 5. List with high out-of-bounds page (e.g., page 99999) should return empty array
  const outOfBounds = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId,
      body: {
        page: 99999 as number &
          tags.Type<"int32"> &
          tags.Default<1> &
          tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(outOfBounds);
  TestValidator.equals(
    "out-of-bounds session result is empty",
    outOfBounds.data.length,
    0,
  );

  // 6. List with filterIp that does not match any real session(s)
  const impossibleIp = "203.0.113.255"; // Reserved test IP per RFC 5737
  const filtered = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId,
      body: {
        page: 1 as number &
          tags.Type<"int32"> &
          tags.Default<1> &
          tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        filterIp: impossibleIp as string & tags.Format<"ipv4">,
      },
    },
  );
  typia.assert(filtered);
  TestValidator.equals("filterIp returning 0 results", filtered.data.length, 0);
}
