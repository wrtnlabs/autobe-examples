import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test validation requirements for session context fields including href and
 * referrer URI parameters. Validates proper handling of session authentication
 * context fields during user registration. Tests comprehensive session tracking
 * and security monitoring throughout the registration process. Validates
 * connection source and referral source URI requirements for audit trail
 * establishment.
 */
export async function test_api_auth_user_registration_session_context_incomplete(
  connection: api.IConnection,
) {
  // Generate valid random data for positive test cases
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "SecurePassword123!";
  const validIPv4 = typia.random<string & tags.Format<"ipv4">>();
  const validHref = typia.random<
    string & tags.Format<"url"> & tags.MinLength<10>
  >();
  const validReferrer = typia.random<
    string & tags.Format<"url"> & tags.MinLength<10>
  >();

  // Test 1: Successful registration with complete valid session context
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      name: RandomGenerator.name(),
      ip: validIPv4,
      href: validHref,
      referrer: validReferrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user1);
  TestValidator.equals(
    "successful registration returns valid authorized user",
    user1.email,
    validEmail,
  );
  TestValidator.predicate(
    "token is properly set",
    user1.token.access.length > 0,
  );

  // Test 2: Registration with minimum required session context (href and referrer only)
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword,
      href: typia.random<string & tags.Format<"url"> & tags.MinLength<10>>(),
      referrer: typia.random<
        string & tags.Format<"url"> & tags.MinLength<10>
      >(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user2);
  TestValidator.equals(
    "registration with minimum context succeeds",
    user2.status,
    "active",
  );

  // Test 3: Registration with IPv4 address format session context
  const user3 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword,
      name: RandomGenerator.name(),
      ip: validIPv4,
      href: `https://example.com/login?from=${validIPv4}`,
      referrer: `https://app.example.com/refer/${validIPv4}`,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user3);
  TestValidator.equals(
    "registration with IPv4 context succeeds",
    user3.email.length > 0,
    true,
  );

  // Test 4: Registration with maximum length URI session context
  const longUri = typia.random<
    string & tags.Format<"url"> & tags.MinLength<10>
  >();
  TestValidator.equals("URI length test", longUri.length >= 10, true);

  const user4 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword,
      name: RandomGenerator.name(),
      href: longUri,
      referrer: `https://referrer.example.com/path?param=${RandomGenerator.alphaNumeric(50)}`,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user4);
  TestValidator.equals(
    "registration with long URIs succeeds",
    user4.id.length > 0,
    true,
  );

  // Test 5: Registration duplicate email should fail (business logic test)
  const duplicateEmail = typia.random<string & tags.Format<"email">>();

  // First registration should succeed
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: duplicateEmail,
      password: validPassword,
      href: validHref,
      referrer: validReferrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(firstUser);

  // Duplicate registration should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: duplicateEmail, // Same email as first user
          password: validPassword,
          href: typia.random<
            string & tags.Format<"url"> & tags.MinLength<10>
          >(),
          referrer: typia.random<
            string & tags.Format<"url"> & tags.MinLength<10>
          >(),
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test 6: Registration without optional fields should succeed
  const user5 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword,
      href: typia.random<string & tags.Format<"url"> & tags.MinLength<10>>(),
      referrer: typia.random<
        string & tags.Format<"url"> & tags.MinLength<10>
      >(),
      // Optional fields (name, ip) omitted
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user5);
  TestValidator.equals(
    "registration without optional fields succeeds",
    user5.name,
    null,
  );

  // Test 7: Registration with null optional fields should succeed
  const user6 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword,
      name: null,
      ip: null,
      href: typia.random<string & tags.Format<"url"> & tags.MinLength<10>>(),
      referrer: typia.random<
        string & tags.Format<"url"> & tags.MinLength<10>
      >(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user6);
  TestValidator.equals(
    "registration with null optional fields succeeds",
    user6.name,
    null,
  );

  // Test 8: Registration with undefined optional fields should succeed
  const user7 = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword,
      href: typia.random<string & tags.Format<"url"> & tags.MinLength<10>>(),
      referrer: typia.random<
        string & tags.Format<"url"> & tags.MinLength<10>
      >(),
      // Optional fields undefined
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user7);
  TestValidator.predicate("id is generated correctly", user7.id.length > 0);

  // Test 9: Verify all registered users have proper authorization tokens
  TestValidator.predicate(
    "user1 has valid JWT access token",
    user1.token.access.length > 50,
  );
  TestValidator.predicate(
    "user2 has valid JWT access token",
    user2.token.access.length > 50,
  );
  TestValidator.predicate(
    "user3 has valid JWT access token",
    user3.token.access.length > 50,
  );
  TestValidator.predicate(
    "user4 has valid JWT access token",
    user4.token.access.length > 50,
  );
  TestValidator.predicate(
    "user5 has valid JWT access token",
    user5.token.access.length > 50,
  );
  TestValidator.predicate(
    "user6 has valid JWT access token",
    user6.token.access.length > 50,
  );
  TestValidator.predicate(
    "user7 has valid JWT access token",
    user7.token.access.length > 50,
  );

  // Test 10: Verify token expiration details
  TestValidator.predicate(
    "tokens have valid expiration timestamps",
    user1.token.expired_at.length > 0 &&
      user1.token.refresh.length > 0 &&
      user1.token.refreshable_until.length > 0,
  );
}
