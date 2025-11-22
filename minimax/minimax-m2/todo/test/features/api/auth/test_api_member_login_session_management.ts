import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_member_login_session_management(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies ITodoAppMember.ICreate;

  const createdMember = await api.functional.auth.member.join.registerMember(
    connection,
    { body: memberData },
  );
  typia.assert(createdMember);

  // Step 2: Test member login with session metadata
  const sessionMetadata = {
    ip: "192.168.1.100",
    href: "https://todoapp.example.com/login",
    referrer: "https://todoapp.example.com/dashboard",
  };

  const loginData = {
    email: memberEmail,
    password: "testpassword123",
    ...sessionMetadata,
  } satisfies ITodoAppMember.ILogin;

  const authenticatedMember =
    await api.functional.auth.member.login.authenticateMember(connection, {
      body: loginData,
    });
  typia.assert(authenticatedMember);

  // Step 3: Validate authentication response and session creation
  TestValidator.equals(
    "authenticated member has correct email",
    authenticatedMember.email,
    memberEmail,
  );

  TestValidator.equals(
    "member profile data matches",
    {
      id: createdMember.id,
      email: createdMember.email,
      first_name: createdMember.first_name,
      last_name: createdMember.last_name,
      status: createdMember.status,
    },
    {
      id: authenticatedMember.id,
      email: authenticatedMember.email,
      first_name: authenticatedMember.first_name,
      last_name: authenticatedMember.last_name,
      status: authenticatedMember.status,
    },
  );

  // Validate JWT token structure
  TestValidator.predicate(
    "authentication token is present",
    authenticatedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authenticatedMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is valid",
    new Date(authenticatedMember.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is valid",
    new Date(authenticatedMember.token.refreshable_until) > new Date(),
  );
}
