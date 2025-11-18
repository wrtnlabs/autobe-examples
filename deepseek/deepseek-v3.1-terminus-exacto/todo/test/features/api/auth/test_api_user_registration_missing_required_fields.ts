import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates user registration functionality with comprehensive field
 * validation.
 *
 * This test ensures the API properly handles user registration requests with
 * valid data, including both required and optional fields. It focuses on
 * successful registration scenarios rather than testing type system
 * violations.
 */
export async function test_api_user_registration_missing_required_fields(
  connection: api.IConnection,
) {
  // Generate valid test data for registration
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(12);
  const validName = RandomGenerator.name();
  const validHref = typia.random<string & tags.Format<"uri">>();
  const validReferrer = typia.random<string & tags.Format<"uri">>();

  // Test successful registration with all required fields
  const userWithRequiredFields = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: validEmail,
        password: validPassword,
        name: validName,
        href: validHref,
        referrer: validReferrer,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(userWithRequiredFields);
  TestValidator.equals(
    "user should have correct email",
    userWithRequiredFields.email,
    validEmail,
  );
  TestValidator.equals(
    "user should have correct name",
    userWithRequiredFields.name,
    validName,
  );

  // Test successful registration with all fields including optional ones
  const userWithAllFields = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      status: "active",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userWithAllFields);

  // Test successful registration with only required fields and optional status
  const userWithStatus = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      status: "pending_verification",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userWithStatus);

  // Test successful registration with only required fields and optional ip
  const userWithIp = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(userWithIp);

  // Validate that all created users have proper token information
  const users = [
    userWithRequiredFields,
    userWithAllFields,
    userWithStatus,
    userWithIp,
  ];
  for (const user of users) {
    TestValidator.predicate(
      "user should have access token",
      user.token.access.length > 0,
    );
    TestValidator.predicate(
      "user should have refresh token",
      user.token.refresh.length > 0,
    );
    TestValidator.predicate(
      "user should have expiration date",
      user.token.expired_at.length > 0,
    );
    TestValidator.predicate(
      "user should have refreshable until date",
      user.token.refreshable_until.length > 0,
    );
  }
}
