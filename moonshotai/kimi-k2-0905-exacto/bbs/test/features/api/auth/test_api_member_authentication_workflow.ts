import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test complete authentication workflow from registration to login. Verify that
 * a newly registered member can successfully authenticate using their
 * credentials, demonstrating the full user onboarding and authentication
 * cycle.
 */
export async function test_api_member_authentication_workflow(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for member registration
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinData = {
    username,
    email,
    password,
    href: "https://example.com/register",
    referrer: "https://example.com/login",
  } satisfies IPoliticsBbsMember.IJoin;

  // Step 2: Register new member account
  const registeredMember = await api.functional.auth.members.join(connection, {
    body: joinData,
  });
  typia.assert(registeredMember);

  // Step 3: Validate registration response with complete field verification
  TestValidator.equals(
    "registered member username matches input",
    registeredMember.username,
    username,
  );
  TestValidator.equals(
    "registered member email matches input",
    registeredMember.email,
    email,
  );
  TestValidator.predicate("member has valid UUID id", () =>
    typia.is<string & tags.Format<"uuid">>(registeredMember.id),
  );
  TestValidator.predicate(
    "member has JWT token",
    () => registeredMember.token.access.length > 0,
  );
  TestValidator.predicate("member token has expiration", () =>
    typia.is<string & tags.Format<"date-time">>(
      registeredMember.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "member token has refresh token",
    () => registeredMember.token.refresh.length > 0,
  );
  TestValidator.predicate("member token has refresh expiration", () =>
    typia.is<string & tags.Format<"date-time">>(
      registeredMember.token.refreshable_until,
    ),
  );
  TestValidator.predicate("member has created_at timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(registeredMember.created_at),
  );
  TestValidator.predicate("member has updated_at timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(registeredMember.updated_at),
  );
  TestValidator.predicate(
    "member has password hash",
    () => registeredMember.password_hash.length > 0,
  );
  TestValidator.predicate(
    "member has correct role",
    () => registeredMember.role === "member",
  );
  TestValidator.predicate(
    "member is not deleted",
    () =>
      registeredMember.deleted_at === undefined ||
      registeredMember.deleted_at === null,
  );

  // Step 4: Verify connection headers are set after registration (authentication state)
  TestValidator.predicate(
    "connection has authorization header after registration",
    () => {
      const headers = connection.headers ?? {};
      return headers.Authorization === registeredMember.token.access;
    },
  );

  // Step 5: Attempt login with same credentials
  const loginData = {
    username,
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/register",
  } satisfies IPoliticsBbsMember.ILogin;

  const authenticatedMember = await api.functional.auth.members.login(
    connection,
    { body: loginData },
  );
  typia.assert(authenticatedMember);

  // Step 6: Validate login response matches registration data comprehensively
  TestValidator.equals(
    "authenticated member id matches registered member",
    authenticatedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "authenticated member username matches registered member",
    authenticatedMember.username,
    registeredMember.username,
  );
  TestValidator.equals(
    "authenticated member email matches registered member",
    authenticatedMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "authenticated member password hash matches",
    authenticatedMember.password_hash,
    registeredMember.password_hash,
  );
  TestValidator.equals(
    "authenticated member created_at matches",
    authenticatedMember.created_at,
    registeredMember.created_at,
  );
  TestValidator.equals(
    "authenticated member updated_at matches",
    authenticatedMember.updated_at,
    registeredMember.updated_at,
  );
  TestValidator.equals(
    "authenticated member role matches",
    authenticatedMember.role,
    registeredMember.role,
  );
  TestValidator.predicate(
    "authenticated member deleted_at matches",
    () => authenticatedMember.deleted_at === registeredMember.deleted_at,
  );
  TestValidator.predicate(
    "authenticated member has new JWT token",
    () => authenticatedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "new token has different access token",
    () => authenticatedMember.token.access !== registeredMember.token.access,
  );
  TestValidator.predicate(
    "authenticated member token has expiration in future",
    () => {
      const expiredAt = new Date(authenticatedMember.token.expired_at);
      return expiredAt.getTime() > Date.now();
    },
  );

  // Step 7: Verify connection headers are updated after login (new authentication state)
  TestValidator.predicate(
    "connection has updated authorization header after login",
    () => {
      const headers = connection.headers ?? {};
      return headers.Authorization === authenticatedMember.token.access;
    },
  );

  // Step 8: Test authentication with wrong password
  const wrongPasswordData = {
    username,
    password: "wrongpassword123",
    href: "https://example.com/login",
    referrer: "https://example.com/register",
  } satisfies IPoliticsBbsMember.ILogin;

  await TestValidator.error(
    "authentication should fail with wrong password",
    async () => {
      await api.functional.auth.members.login(connection, {
        body: wrongPasswordData,
      });
    },
  );

  // Step 9: Test authentication with non-existent username
  const nonExistentUserData = {
    username: "nonexistentuser12345",
    password,
    href: "https://example.com/login",
    referrer: "https://example.com/register",
  } satisfies IPoliticsBbsMember.ILogin;

  await TestValidator.error(
    "authentication should fail with non-existent username",
    async () => {
      await api.functional.auth.members.login(connection, {
        body: nonExistentUserData,
      });
    },
  );
}
