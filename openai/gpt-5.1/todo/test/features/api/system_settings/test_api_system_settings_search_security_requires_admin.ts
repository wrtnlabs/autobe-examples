import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_search_security_requires_admin(
  connection: api.IConnection,
) {
  // 1. Unauthenticated call: use a cloned connection with empty headers to ensure
  // no Authorization is sent, then expect the admin-only systemSettings.index
  // endpoint to reject the call. We only verify that an error occurs, not the
  // exact HTTP status code.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated users cannot search system settings",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.index(
        unauthenticatedConnection,
        {
          body: {
            page: 1,
            pageSize: 10,
          } satisfies ITodoAppSystemSetting.IRequest,
        },
      );
    },
  );

  // 2. Join an admin user and perform an authorized search call that should
  // succeed, validating the resulting page structure.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: null,
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminPage: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: {
        page: 1,
        pageSize: 20,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(adminPage);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "admin search pagination current page is >= 0",
    adminPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "admin search pagination limit is >= 0",
    adminPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "admin search pagination records is >= 0",
    adminPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "admin search pagination pages is >= 0",
    adminPage.pagination.pages >= 0,
  );

  // 3. Join a member user and verify that memberUser tokens cannot access the
  // admin-only systemSettings.index endpoint.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://app.todoapp.local/join/member",
    referrer: "https://app.todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  await TestValidator.error(
    "memberUser tokens cannot search admin system settings",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.index(connection, {
        body: {
          page: 1,
          pageSize: 5,
        } satisfies ITodoAppSystemSetting.IRequest,
      });
    },
  );

  // 4. Join a guest user and verify guest tokens also cannot access the admin
  // system settings search.
  const guestJoinBody = {
    external_ref: "guest-correlation-id",
  } satisfies ITodoAppGuestUser.IJoinRequest;

  const guestAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinBody,
    });
  typia.assert(guestAuthorized);

  await TestValidator.error(
    "guestUser tokens cannot search admin system settings",
    async () => {
      await api.functional.todoApp.adminUser.systemSettings.index(connection, {
        body: {
          page: 1,
          pageSize: 5,
        } satisfies ITodoAppSystemSetting.IRequest,
      });
    },
  );
}
