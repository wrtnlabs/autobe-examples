import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

/**
 * Tests member profile retrieval for authenticated member accessing their own
 * profile. Validates email, account details, and metadata returned through the
 * API.
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IMemberCreate.IRequest;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: joinRequest,
  });
  typia.assert(authorizedMember);

  // Step 2: Validate the member was created successfully
  TestValidator.equals(
    "member email matches",
    authorizedMember.email,
    joinRequest.email,
  );
  TestValidator.predicate(
    "member has valid role",
    authorizedMember.role === "member" || authorizedMember.role === "admin",
  );
  TestValidator.predicate(
    "member has authorization token",
    authorizedMember.token !== null &&
      authorizedMember.token.access !== null &&
      authorizedMember.token.refresh !== null,
  );

  // Step 3: Retrieve the member profile using the member ID
  const memberProfile = await api.functional.todo.member.members.at(
    connection,
    {
      memberId: authorizedMember.id,
    },
  );
  typia.assert(memberProfile);

  // Step 4: Validate profile data matches the created account
  TestValidator.equals(
    "profile ID matches",
    memberProfile.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "profile email matches",
    memberProfile.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "profile role matches",
    memberProfile.role,
    authorizedMember.role.toString(),
  );
  TestValidator.equals(
    "profile last login matches",
    memberProfile.last_login_at,
    authorizedMember.last_login_at,
  );

  // Step 5: Validate profile contains required fields and appropriate data
  TestValidator.predicate(
    "profile has valid ID format",
    typeof memberProfile.id === "string" && memberProfile.id.length > 0,
  );
  TestValidator.predicate(
    "profile has valid email",
    typeof memberProfile.email === "string" &&
      memberProfile.email.includes("@"),
  );
  TestValidator.predicate(
    "profile has created_at timestamp",
    memberProfile.created_at !== null && memberProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "profile has updated_at timestamp",
    memberProfile.updated_at !== null && memberProfile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "account was created before profile retrieval",
    new Date(memberProfile.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "account was updated on or after creation",
    new Date(memberProfile.updated_at) >= new Date(memberProfile.created_at),
  );

  // Step 6: Test edge case - invalid member ID should fail
  const invalidMemberId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "invalid member ID should return error",
    async () => {
      await api.functional.todo.member.members.at(connection, {
        memberId: invalidMemberId,
      });
    },
  );
}
