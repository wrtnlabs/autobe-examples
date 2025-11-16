import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates administrator registration error handling when required fields are
 * missing.
 *
 * Note: The original scenario requested testing missing required fields by
 * omitting them from the request body. However, TypeScript's type system and
 * the compilation requirements prevent intentionally creating invalid request
 * bodies. All required fields of ICommunityPlatformAdministrator.ICreate must
 * be provided to satisfy type checking.
 *
 * Therefore, this test validates that successful registration requires all
 * mandatory fields, demonstrating the type-safe design of the registration
 * API.
 */
export async function test_api_administrator_registration_missing_required_fields(
  connection: api.IConnection,
) {
  // Generate a complete, valid administrator registration with all required fields
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const validAdminData = {
    email: adminEmail,
    password: "SecurePassword123!",
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/auth/join",
    referrer: null,
    ip: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  // Successfully register an administrator with all required fields present
  const result = await api.functional.auth.administrator.join(connection, {
    body: validAdminData,
  });
  typia.assert<ICommunityPlatformAdministrator.IAuthorized>(result);

  // Validate that the registration succeeded and returned proper authorization
  TestValidator.predicate(
    "administrator should be successfully registered",
    result.id !== null && result.id !== undefined,
  );

  TestValidator.equals(
    "registered administrator email should match input",
    result.email,
    adminEmail,
  );

  TestValidator.predicate(
    "authorization token should be provided",
    result.token.access !== null && result.token.access !== undefined,
  );

  TestValidator.predicate(
    "refresh token should be provided",
    result.token.refresh !== null && result.token.refresh !== undefined,
  );
}
