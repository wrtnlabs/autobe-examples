import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppLoginAttempt";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLoginAttempt";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that an admin user can retrieve detailed information about a
 * specific login attempt by its identifier.
 *
 * Business context:
 *
 * - Todo_app_login_attempts is an immutable audit log capturing both member and
 *   admin authentication attempts.
 * - Admin users must be able to search for login attempts and then drill down
 *   into a specific record to inspect full details (identifier, actor type,
 *   success flag, IP, and linked user summaries).
 *
 * This test performs a realistic, end-to-end lifecycle:
 *
 * 1. Register a member user and perform multiple login attempts to populate login
 *    attempts for a non-admin actor.
 * 2. Create a todo as the member to ensure the member user is a real, active actor
 *    with normal application usage.
 * 3. Register and log in as an admin user so that:
 *
 *    - Admin login attempts themselves are recorded, and
 *    - The connection is authenticated as an admin for secure endpoints.
 * 4. As the admin, call PATCH /todoApp/adminUser/loginAttempts to search for login
 *    attempts, filtering by a known login_identifier or actor_type to ensure at
 *    least one record is returned.
 * 5. Capture one ITodoAppLoginAttempt.ISummary, then invoke GET
 *    /todoApp/adminUser/loginAttempts/{loginAttemptId} using the summary.id.
 * 6. Assert that the detailed ITodoAppLoginAttempt returned by the GET call
 *    matches the summary on core fields (id, login_identifier, actor_type,
 *    succeeded, ip, failure_reason, created_at) and that the
 *    memberUser/adminUser relational summaries are consistent with the
 *    actor_type and any summary-provided relations.
 * 7. Optionally re-fetch the same id to confirm the endpoint is side-effect-free
 *    and returns a stable record.
 */
export async function test_api_admin_login_attempt_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberJoinRequest = typia.random<ITodoAppMemberUserJoin.IRequest>();
  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 2. Perform member login attempts (one success, one failure)
  const memberLoginSuccessRequest: ITodoAppMemberUserLogin.IRequest = {
    email: memberJoinRequest.email,
    password: memberJoinRequest.password,
    href: memberJoinRequest.href,
    referrer: memberJoinRequest.referrer,
    ip: memberJoinRequest.ip ?? null,
  };
  const memberLoginAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginSuccessRequest,
    });
  typia.assert(memberLoginAuthorized);

  const memberLoginFailureRequest: ITodoAppMemberUserLogin.IRequest = {
    email: memberJoinRequest.email,
    password: typia.random<ITodoAppMemberUserLogin.IRequest>().password,
    href: memberJoinRequest.href,
    referrer: memberJoinRequest.referrer,
    ip: memberJoinRequest.ip ?? null,
  };
  await TestValidator.error(
    "member login failure attempt recorded",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: memberLoginFailureRequest,
      });
    },
  );

  // 3. Create a todo as the authenticated member user
  const todoCreateBody = typia.random<ITodoAppTodo.ICreate>();
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 4. Register an admin user
  const adminJoinBase = typia.random<ITodoAppAdminUser.IJoin>();
  const adminEmail = adminJoinBase.email;
  const adminPassword = adminJoinBase.password;
  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminJoinBase.display_name,
      },
    });
  typia.assert(adminAuthorizedFromJoin);

  // 5. Admin login to create login attempts and ensure admin auth context
  const adminLoginBase = typia.random<ITodoAppAdminUser.ILogin>();
  const adminLoginRequest: ITodoAppAdminUser.ILogin = {
    email: adminEmail,
    password: adminPassword,
    href: adminLoginBase.href,
    referrer: adminLoginBase.referrer,
    ip: adminLoginBase.ip ?? null,
    user_agent: adminLoginBase.user_agent ?? null,
  };
  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. Search login attempts as admin
  const primarySearchBody: ITodoAppLoginAttempt.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    login_identifier: adminEmail,
    actor_type: "adminUser",
    succeeded: undefined,
    ip: undefined,
    failure_reason: undefined,
    created_from: null,
    created_to: null,
  };
  let page: IPageITodoAppLoginAttempt.ISummary =
    await api.functional.todoApp.adminUser.loginAttempts.index(connection, {
      body: primarySearchBody,
    });
  typia.assert(page);

  if (page.data.length === 0) {
    const fallbackSearchBody: ITodoAppLoginAttempt.IRequest = {
      page: 1 as number & tags.Type<"int32">,
      limit: 20 as number & tags.Type<"int32">,
      actor_type: "adminUser",
      login_identifier: undefined,
      succeeded: undefined,
      ip: undefined,
      failure_reason: undefined,
      created_from: null,
      created_to: null,
    };
    page = await api.functional.todoApp.adminUser.loginAttempts.index(
      connection,
      {
        body: fallbackSearchBody,
      },
    );
    typia.assert(page);
  }

  TestValidator.predicate(
    "at least one login attempt should exist for admin search",
    page.data.length > 0,
  );

  const summary: ITodoAppLoginAttempt.ISummary = page.data[0];
  typia.assert(summary);

  // 7. Retrieve detail by loginAttemptId as admin
  const detail: ITodoAppLoginAttempt =
    await api.functional.todoApp.adminUser.loginAttempts.at(connection, {
      loginAttemptId: summary.id,
    });
  typia.assert(detail);

  // 8. Compare core fields between summary and detail
  TestValidator.equals(
    "login attempt id should match between summary and detail",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "login_identifier should match between summary and detail",
    detail.login_identifier,
    summary.login_identifier,
  );
  TestValidator.equals(
    "actor_type should match between summary and detail",
    detail.actor_type,
    summary.actor_type,
  );
  TestValidator.equals(
    "succeeded flag should match between summary and detail",
    detail.succeeded,
    summary.succeeded,
  );
  TestValidator.equals(
    "ip should match between summary and detail",
    detail.ip,
    summary.ip,
  );
  TestValidator.equals(
    "failure_reason should match between summary and detail",
    detail.failure_reason ?? null,
    summary.failure_reason ?? null,
  );
  TestValidator.equals(
    "created_at should match between summary and detail",
    detail.created_at,
    summary.created_at,
  );

  // 9. Validate memberUser/adminUser summary consistency
  if (summary.memberUser !== undefined && summary.memberUser !== null) {
    TestValidator.predicate(
      "detail.memberUser should be defined when summary.memberUser exists",
      detail.memberUser !== undefined && detail.memberUser !== null,
    );
    if (detail.memberUser !== undefined && detail.memberUser !== null) {
      TestValidator.equals(
        "memberUser.id should match between summary and detail",
        detail.memberUser.id,
        summary.memberUser.id,
      );
      TestValidator.equals(
        "memberUser.email should match between summary and detail",
        detail.memberUser.email,
        summary.memberUser.email,
      );
    }
  } else {
    TestValidator.predicate(
      "detail.memberUser may be undefined when summary.memberUser is absent",
      detail.memberUser === undefined || detail.memberUser === null,
    );
  }

  if (summary.adminUser !== undefined && summary.adminUser !== null) {
    TestValidator.predicate(
      "detail.adminUser should be defined when summary.adminUser exists",
      detail.adminUser !== undefined && detail.adminUser !== null,
    );
    if (detail.adminUser !== undefined && detail.adminUser !== null) {
      TestValidator.equals(
        "adminUser.id should match between summary and detail",
        detail.adminUser.id,
        summary.adminUser.id,
      );
      TestValidator.equals(
        "adminUser.email should match between summary and detail",
        detail.adminUser.email,
        summary.adminUser.email,
      );
    }
  } else {
    TestValidator.predicate(
      "detail.adminUser may be undefined when summary.adminUser is absent",
      detail.adminUser === undefined || detail.adminUser === null,
    );
  }

  // 10. Re-fetch the same loginAttemptId to confirm idempotent read
  const detailAgain: ITodoAppLoginAttempt =
    await api.functional.todoApp.adminUser.loginAttempts.at(connection, {
      loginAttemptId: summary.id,
    });
  typia.assert(detailAgain);

  TestValidator.equals(
    "detail re-fetch should yield the same record as initial detail",
    detailAgain,
    detail,
  );
}
