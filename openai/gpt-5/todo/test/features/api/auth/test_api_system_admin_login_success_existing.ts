import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

export async function test_api_system_admin_login_success_existing(
  connection: api.IConnection,
) {
  // Validate successful login for an existing system administrator with
  // lowercase email normalization, fresh token issuance, and timestamp
  // consistency.

  // -- Arrange --------------------------------------------------------------
  const emailLocal = `login.admin.${RandomGenerator.alphaNumeric(8)}`;
  const emailLower = `${emailLocal}@example.com`.toLowerCase();
  const password = `Adm1n!${RandomGenerator.alphaNumeric(12)}`;

  // 1) Join: create an administrator to authenticate against
  const joined = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: emailLower,
      password,
    } satisfies ITodoListSystemAdmin.ICreate,
  });
  typia.assert(joined);

  // Email should be normalized to lowercase
  TestValidator.equals(
    "email normalized to lowercase after join",
    joined.email,
    emailLower,
  );

  // 2) Login: authenticate using email with different casing
  const loginEmailCase = emailLower.toUpperCase();
  const logged = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: loginEmailCase,
      password,
    } satisfies ITodoListSystemAdmin.ILogin,
  });
  typia.assert(logged);

  // -- Assertions -----------------------------------------------------------
  // Identity consistency
  TestValidator.equals(
    "login returns same admin id as join",
    logged.id,
    joined.id,
  );
  TestValidator.equals(
    "login normalizes email to lowercase",
    logged.email,
    emailLower,
  );

  // Token issuance checks
  TestValidator.predicate(
    "access token is non-empty",
    logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    logged.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token should be freshly issued on login (different from join)",
    logged.token.access,
    joined.token.access,
  );

  // Timestamp invariants
  TestValidator.equals(
    "created_at remains unchanged across login",
    logged.created_at,
    joined.created_at,
  );
  const tJoin = new Date(joined.updated_at).getTime();
  const tLogin = new Date(logged.updated_at).getTime();
  TestValidator.predicate(
    "updated_at on login is not earlier than join.updated_at",
    tLogin >= tJoin,
  );

  // Optional embedded admin profile validations (when present)
  if (logged.admin !== undefined) {
    typia.assert(logged.admin);
    TestValidator.equals(
      "embedded admin.id matches the authorized id",
      logged.admin.id,
      logged.id,
    );
    TestValidator.equals(
      "embedded admin.email is normalized to lowercase",
      logged.admin.email,
      emailLower,
    );
    const deletedAtOrNull = logged.admin.deleted_at ?? null;
    TestValidator.equals(
      "embedded admin.deleted_at is null (active account)",
      deletedAtOrNull,
      null,
    );
  }
}
