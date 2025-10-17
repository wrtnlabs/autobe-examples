import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Generate test data for member registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10); // 10 characters for password complexity

  // Create registration request body
  const registrationData = {
    email,
    password,
  } satisfies IMemberCreate.IRequest;

  // Perform member registration
  const registeredMember: ITodoMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate member details using complete type check
  typia.assert(registeredMember);

  // Verify core business logic - member details match input
  TestValidator.equals(
    "member email matches registration email",
    registeredMember.email,
    email,
  );
  TestValidator.equals(
    "member has member role",
    registeredMember.role,
    "member",
  );

  // Validate authentication is properly established
  TestValidator.predicate(
    "authorization header exists in connection",
    typeof connection.headers === "object" && connection.headers !== null,
  );
  TestValidator.predicate(
    "authorization token is set",
    typeof connection.headers?.Authorization === "string",
  );
  TestValidator.equals(
    "authorization matches access token",
    connection.headers?.Authorization,
    registeredMember.token.access,
  );

  // Verify member ID generation
  TestValidator.predicate(
    "member has valid ID",
    typeof registeredMember.id === "string" && registeredMember.id.length > 0,
  );

  // Validate new member doesn't have login timestamp
  TestValidator.predicate(
    "new member has no last_login_at",
    registeredMember.last_login_at === null ||
      registeredMember.last_login_at === undefined,
  );
}
