import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminSession";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Deny access to admin session records after soft-deletion of the admin
 * account.
 *
 * This test ensures that once an admin account has been soft-deleted
 * (deleted_at set), all requests to list session records for that admin are
 * denied. This validates compliance with the least-privilege principle,
 * guaranteeing that privileged session data is never disclosed for deleted
 * admins, even if a session token is still present. The test covers the
 * workflow of admin registration, deletion, and session listing attempt, with a
 * strict assertion that the session retrieval is blocked after deletion.
 *
 * Test steps:
 *
 * 1. Register a new admin account and obtain identity.
 * 2. Soft-delete the admin using their UUID.
 * 3. Try to access the session listing endpoint for the deleted admin.
 * 4. Confirm via TestValidator.error that access is denied—no session data must be
 *    retrievable.
 */
export async function test_api_admin_session_list_access_denied_for_deleted_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Soft-delete that admin
  await api.functional.todoApp.admin.admins.erase(connection, {
    adminId: admin.id,
  });

  // 3. Attempt to list sessions for the deleted admin (should fail with access denial)
  const sessionListFilter = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ITodoAppAdminSession.IRequest;

  await TestValidator.error(
    "session list retrieval must be denied for deleted admin",
    async () => {
      await api.functional.todoApp.admin.admins.sessions.index(connection, {
        adminId: admin.id,
        body: sessionListFilter,
      });
    },
  );
}
