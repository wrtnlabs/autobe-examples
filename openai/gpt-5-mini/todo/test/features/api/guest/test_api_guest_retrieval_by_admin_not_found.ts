import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

export async function test_api_guest_retrieval_by_admin_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate admin retrieval behavior for missing guest resources.
   *
   * Steps:
   *
   * 1. Register a new admin via POST /auth/admin/join to obtain authorization.
   * 2. Attempt to retrieve a guest with a well-formed but non-existent UUID and
   *    assert that the call results in an error (server-side not found).
   *
   * Note: Although the original scenario requested testing malformed path
   * parameters (invalid UUID format -> 400), the SDK function signature
   * enforces guestId: string & tags.Format<"uuid"> at compile time. Creating
   * tests that intentionally bypass typing (to send an invalid format) would
   * introduce deliberate type errors and/or require unsafe casts (forbidden by
   * policy). Therefore this test-suite only covers the
   * well-formed-but-nonexistent case and documents the limitation.
   */

  // 1) Admin sign-up (authorization)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPayload = {
    email: adminEmail,
    password: "ValidPa$123",
    is_super: false,
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminPayload,
    },
  );
  typia.assert(admin);

  // 2) Well-formed but non-existent UUID should produce a runtime error (resource not found)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent guest should produce an error",
    async () => {
      await api.functional.todoApp.admin.guests.at(connection, {
        guestId: nonExistentId,
      });
    },
  );

  // Malformed-id test omitted to preserve type safety and avoid intentional type errors.
}
