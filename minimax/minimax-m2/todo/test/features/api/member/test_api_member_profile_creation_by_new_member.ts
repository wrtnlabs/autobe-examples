import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test successful member profile creation workflow for new users joining the
 * TodoApp system. This test validates the complete onboarding process where a
 * new user first registers for authentication, then creates their profile with
 * essential information.
 *
 * The scenario tests: 1) Member registration through authentication endpoint to
 * establish user context, 2) Profile creation with email, optional personal
 * details (first name, last name), and account status, 3) Validation of proper
 * unique email constraint enforcement, 4) Verification of default status
 * handling and proper audit trail establishment. This represents the primary
 * member onboarding process where new users establish their TodoApp identity
 * and gain access to todo management functionality.
 */
export async function test_api_member_profile_creation_by_new_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member for authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1), // Single word name
        last_name: RandomGenerator.name(1), // Single word name
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals(
    "member email should match input",
    member.email,
    memberEmail,
  );
  TestValidator.equals(
    "member status should be active",
    member.status,
    "active",
  );
  TestValidator.predicate("member should have id", !!member.id);
  TestValidator.predicate(
    "member should have created_at timestamp",
    !!member.created_at,
  );
  TestValidator.predicate(
    "member should have updated_at timestamp",
    !!member.updated_at,
  );
  TestValidator.predicate(
    "member should have authentication token",
    !!member.token,
  );

  // Step 2: Create a new member profile using authenticated context
  const profileEmail: string = typia.random<string & tags.Format<"email">>();
  const newProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: profileEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(newProfile);

  // Step 3: Validate profile creation response
  TestValidator.equals(
    "profile email should match input",
    newProfile.email,
    profileEmail,
  );
  TestValidator.equals(
    "profile status should be active",
    newProfile.status,
    "active",
  );
  TestValidator.predicate("profile should have unique id", !!newProfile.id);
  TestValidator.predicate(
    "profile should have created_at timestamp",
    !!newProfile.created_at,
  );
  TestValidator.predicate(
    "profile should have updated_at timestamp",
    !!newProfile.updated_at,
  );

  // Step 4: Test email uniqueness constraint by attempting duplicate email
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: profileEmail, // Same email as previously created
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  });

  // Step 5: Verify optional fields are handled correctly
  const profileWithOptionalFields: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        // first_name and last_name omitted - testing optional fields
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(profileWithOptionalFields);
  TestValidator.equals(
    "profile without names should be created",
    profileWithOptionalFields.email.length > 0,
    true,
  );
  TestValidator.predicate(
    "profile should have default empty optional fields",
    profileWithOptionalFields.first_name === undefined &&
      profileWithOptionalFields.last_name === undefined,
  );
}
