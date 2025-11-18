import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Verify that only authenticated admin users can list admin user accounts.
 *
 * Scenario:
 *
 * 1. Call the admin listing endpoint without any Authorization header and ensure
 *    it fails.
 * 2. Register a regular member user and, using that member-authenticated
 *    connection, attempt to call the admin listing endpoint and ensure it fails
 *    again.
 * 3. Register an admin user, which issues an admin token into the shared
 *    connection, and then call the admin listing endpoint successfully.
 *
 * The test must only assert that unauthorized/forbidden attempts throw some
 * error (using TestValidator.error), without asserting concrete HTTP status
 * codes or error payloads. For the successful path, the response must be
 * asserted via typia.assert as IPageITodoAppAdminuser.ISummary and basic
 * pagination invariants must be checked via TestValidator (e.g. current page
 * index is non-negative, limit and pages are non-negative, records is
 * non-negative, and that data is an array).
 */
export async function test_api_admin_user_index_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 0. Prepare a minimal request body for admin listing.
  const requestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    keyword: null,
    status: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
  } satisfies ITodoAppAdminUser.IRequest;

  // 1. Unauthenticated call: create a derived connection without headers.
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to adminUsers.index must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.index(unauthenticated, {
        body: requestBody,
      });
    },
  );

  // 2. Authenticate as member user and attempt to list admin users.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const member: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  await TestValidator.error(
    "memberUser access to adminUsers.index must fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.index(connection, {
        body: requestBody,
      });
    },
  );

  // 3. Authenticate as admin user and successfully list admin users.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const page: IPageITodoAppAdminuser.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  const pagination = page.pagination;
  TestValidator.predicate(
    "current page index must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit must be non-negative", pagination.limit >= 0);
  TestValidator.predicate(
    "records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages must be non-negative", pagination.pages >= 0);

  TestValidator.predicate(
    "data must be an array (already ensured by typia, but check length semantics)",
    Array.isArray(page.data) && page.data.length <= pagination.records,
  );
}
