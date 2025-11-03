import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_system_admin_join(connection: api.IConnection) {
  // 1) Prepare unique admin join payload
  const adminEmail = `system-admin-${Date.now()}@example.test`;
  const password = "Passw0rd!"; // satisfies min8 + upper + lower + digit
  const createBody = {
    email: adminEmail,
    password,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityBbsSystemAdmin.ICreate;

  // 2) Call join API and validate response shape
  const output: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  // Full response shape validation
  typia.assert(output);

  // Token presence and basic sanity checks
  TestValidator.predicate(
    "access token is non-empty",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );

  // Lightweight sanity check that tokens resemble JWTs (contain a dot)
  TestValidator.predicate(
    "access token looks like jwt",
    output.token.access.includes(".") === true,
  );
  TestValidator.predicate(
    "refresh token looks like jwt-ish",
    output.token.refresh.includes(".") === true,
  );

  // Ensure token expiration metadata present
  TestValidator.predicate(
    "token.expired_at present",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until present",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );

  // Admin summary presence
  typia.assert(output.admin);
  TestValidator.predicate(
    "admin id present",
    typeof output.id === "string" && output.id.length > 0,
  );

  // 3) Duplicate creation must fail (uniqueness enforcement)
  await TestValidator.error(
    "duplicate system admin join should fail",
    async () => {
      await api.functional.auth.systemAdmin.join(connection, {
        body: createBody,
      });
    },
  );

  // Note: Direct Prisma DB verification (password_hash, sessions, audit logs)
  // is intentionally omitted because Prisma client is not available in the
  // test template imports. This test verifies server-observable behaviors
  // (response content and uniqueness enforcement) instead.
}
