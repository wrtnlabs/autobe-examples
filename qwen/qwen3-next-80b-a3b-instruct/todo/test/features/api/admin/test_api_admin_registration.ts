import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_registration(connection: api.IConnection) {
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = typia.random<string & tags.Format<"password">>();
  const availableRoles = ["admin", "super_admin"] as const;
  const role = RandomGenerator.pick(availableRoles);

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email,
        password_hash: passwordHash,
        role,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  TestValidator.equals("admin email matches", admin.email, email);
  TestValidator.equals("admin role matches", admin.role, role);
  TestValidator.predicate(
    "token access exists",
    () => admin.token.access !== "",
  );
  TestValidator.predicate(
    "token refresh exists",
    () => admin.token.refresh !== "",
  );
}
