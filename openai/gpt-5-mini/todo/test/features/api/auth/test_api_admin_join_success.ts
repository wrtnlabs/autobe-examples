import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_join_success(connection: api.IConnection) {
  // 1) Prepare a unique, valid admin creation request
  const adminEmail = `test-admin+${Date.now()}@example.com`;
  const requestBody = {
    email: adminEmail,
    password: "StrongPassw0rd!",
    is_super: true,
  } satisfies ITodoAppAdmin.ICreate;

  // 2) Call the API to create/join admin
  const output: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: requestBody,
    });

  // 3) Validate the response shape and types (typia.assert handles all type/format checks)
  typia.assert(output);

  // 4) Business assertions
  TestValidator.equals(
    "returned email matches request",
    output.email,
    adminEmail,
  );
  TestValidator.equals(
    "returned is_super matches request",
    output.is_super,
    true,
  );

  // token presence: ensure token.access and token.refresh are non-empty strings
  TestValidator.predicate(
    "access token is present",
    typeof output.token?.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof output.token?.refresh === "string" &&
      output.token.refresh.length > 0,
  );

  // created_at parseable (ISO 8601) - tolerant assertion: must be parseable to a numeric time
  TestValidator.predicate(
    "created_at is parseable ISO 8601",
    typeof output.created_at === "string" &&
      !Number.isNaN(Date.parse(output.created_at)),
  );

  // last_active_at may be null or string; if string, it should be parseable
  TestValidator.predicate(
    "last_active_at is null or parseable",
    output.last_active_at === null ||
      (typeof output.last_active_at === "string" &&
        !Number.isNaN(Date.parse(output.last_active_at))),
  );

  // Ensure sensitive credential fields are not present in returned keys (e.g., password_hash)
  TestValidator.predicate(
    "response does not expose password_hash",
    !Object.keys(output).includes("password_hash"),
  );
}
