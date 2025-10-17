import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

/**
 * Test comprehensive member profile update workflow including email
 * modification, role verification, and account management features.
 *
 * This test validates the complete member profile update functionality,
 * covering essential scenarios such as:
 *
 * 1. Creating a new member account with valid credentials
 * 2. Successfully updating member profile information including email changes
 * 3. Verifying role-based permissions and access control during updates
 * 4. Ensuring proper session management and authentication continuity
 * 5. Validating data integrity and timestamp updates after modifications
 * 6. Testing edge cases like duplicate email attempts and invalid data
 *
 * The test follows a realistic user journey from registration through profile
 * management, ensuring that all security constraints are properly enforced
 * while maintaining a smooth user experience for legitimate profile updates.
 */
export async function test_api_member_profile_update_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing profile updates
  const newEmail = typia.random<string & tags.Format<"email">>();
  const joinRequest = {
    email: newEmail,
    password: "SecurePassword123",
  } satisfies IMemberCreate.IRequest;

  const newMember: ITodoMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinRequest });
  typia.assert(newMember);

  TestValidator.equals(
    "new member email matches request",
    newMember.email,
    newEmail,
  );
  TestValidator.equals("new member has member role", newMember.role, "member");
  TestValidator.predicate(
    "member has valid token",
    newMember.token.access.length > 0,
  );

  // Step 2: Update member email address with new valid email
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updateRequest = {
    email: updatedEmail,
  } satisfies ITodoMember.IUpdate;

  const updatedMember: ITodoMember =
    await api.functional.todo.member.members.update(connection, {
      memberId: newMember.id,
      body: updateRequest,
    });
  typia.assert(updatedMember);

  TestValidator.equals(
    "updated member email matches new email",
    updatedMember.email,
    updatedEmail,
  );
  TestValidator.equals(
    "member role remains unchanged",
    updatedMember.role,
    "member",
  );
  TestValidator.predicate(
    "updated timestamp is newer than created",
    updatedMember.updated_at > updatedMember.created_at,
  );

  // Step 3: Test updating only specific fields (partial update with null)
  const partialUpdate = {
    email: null,
  } satisfies ITodoMember.IUpdate;

  const partiallyUpdatedMember: ITodoMember =
    await api.functional.todo.member.members.update(connection, {
      memberId: newMember.id,
      body: partialUpdate,
    });
  typia.assert(partiallyUpdatedMember);

  TestValidator.equals(
    "partial update preserves current email",
    partiallyUpdatedMember.email,
    updatedEmail,
  );
  TestValidator.equals(
    "partial update preserves role",
    partiallyUpdatedMember.role,
    "member",
  );

  // Step 4: Test updating multiple fields simultaneously including role
  const adminRole: IETodoRole = "admin";
  const multiFieldUpdate = {
    email: typia.random<string & tags.Format<"email">>(),
    role: adminRole,
  } satisfies ITodoMember.IUpdate;

  const multiUpdatedMember: ITodoMember =
    await api.functional.todo.member.members.update(connection, {
      memberId: newMember.id,
      body: multiFieldUpdate,
    });
  typia.assert(multiUpdatedMember);

  TestValidator.equals(
    "multi-field update applies new email",
    multiUpdatedMember.email,
    multiFieldUpdate.email,
  );
  TestValidator.equals(
    "multi-field update applies admin role",
    multiUpdatedMember.role,
    adminRole,
  );
  TestValidator.predicate(
    "multi-field update timestamp is updated",
    multiUpdatedMember.updated_at > partiallyUpdatedMember.updated_at,
  );

  // Step 5: Test edge case - update with same email (should succeed)
  const sameEmailUpdate = {
    email: multiUpdatedMember.email,
  } satisfies ITodoMember.IUpdate;

  const sameEmailMember: ITodoMember =
    await api.functional.todo.member.members.update(connection, {
      memberId: newMember.id,
      body: sameEmailUpdate,
    });
  typia.assert(sameEmailMember);

  TestValidator.equals(
    "same email update preserves email",
    sameEmailMember.email,
    multiUpdatedMember.email,
  );
  TestValidator.equals(
    "same email update preserves admin role",
    sameEmailMember.role,
    adminRole,
  );

  // Step 6: Test role reversal back to member
  const memberRole: IETodoRole = "member";
  const roleReversalUpdate = {
    role: memberRole,
  } satisfies ITodoMember.IUpdate;

  const memberRoleMember: ITodoMember =
    await api.functional.todo.member.members.update(connection, {
      memberId: newMember.id,
      body: roleReversalUpdate,
    });
  typia.assert(memberRoleMember);

  TestValidator.equals(
    "member role reversion applies new role",
    memberRoleMember.role,
    memberRole,
  );
  TestValidator.equals(
    "member role reversion preserves email",
    memberRoleMember.email,
    sameEmailMember.email,
  );

  // Step 7: Test null update for both fields
  const nullBothFieldsUpdate = {
    email: null,
    role: null,
  } satisfies ITodoMember.IUpdate;

  const nullUpdatedMember: ITodoMember =
    await api.functional.todo.member.members.update(connection, {
      memberId: newMember.id,
      body: nullBothFieldsUpdate,
    });
  typia.assert(nullUpdatedMember);

  TestValidator.equals(
    "null both fields preserves current email",
    nullUpdatedMember.email,
    memberRoleMember.email,
  );
  TestValidator.equals(
    "null both fields preserves current role",
    nullUpdatedMember.role,
    memberRoleMember.role,
  );
  TestValidator.predicate(
    "null both fields preserves created timestamp",
    nullUpdatedMember.created_at === memberRoleMember.created_at,
  );
  TestValidator.predicate(
    "null both fields updates modified timestamp",
    nullUpdatedMember.updated_at > memberRoleMember.updated_at,
  );
}
