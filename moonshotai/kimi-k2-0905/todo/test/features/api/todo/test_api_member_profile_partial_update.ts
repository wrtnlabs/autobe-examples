import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

export async function test_api_member_profile_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new member for testing
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const registrationRequest = {
    body: {
      email: originalEmail,
      password: "TestPass123",
    } satisfies IMemberCreate.IRequest,
  };

  const newMember = await api.functional.auth.member.join(
    connection,
    registrationRequest,
  );
  typia.assert(newMember);

  // Step 2: Test partial update - change only email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const emailUpdateData = {
    memberId: newMember.id,
    body: {
      email: newEmail,
    } satisfies ITodoMember.IUpdate,
  };

  const emailUpdatedMember = await api.functional.todo.member.members.update(
    connection,
    emailUpdateData,
  );
  typia.assert(emailUpdatedMember);

  // Validate email change but other fields preserved
  TestValidator.equals(
    "email should be updated to new value",
    emailUpdatedMember.email,
    newEmail,
  );
  TestValidator.equals(
    "member ID should remain the same",
    emailUpdatedMember.id,
    newMember.id,
  );
  TestValidator.equals(
    "role should remain unchanged",
    emailUpdatedMember.role,
    newMember.role,
  );

  // Step 3: Test role update with proper role construction
  const updatedRole: IETodoRole = newMember.role.startsWith("admin")
    ? "member"
    : "admin";
  const roleUpdateData = {
    memberId: newMember.id,
    body: {
      role: updatedRole,
    } satisfies ITodoMember.IUpdate,
  };

  const roleUpdatedMember = await api.functional.todo.member.members.update(
    connection,
    roleUpdateData,
  );
  typia.assert(roleUpdatedMember);

  // Validate role change but email preserved
  TestValidator.equals(
    "role should be updated to new value",
    roleUpdatedMember.role,
    updatedRole,
  );
  TestValidator.equals(
    "email should remain from previous update",
    roleUpdatedMember.email,
    newEmail,
  );
  TestValidator.equals(
    "member ID should remain the same",
    roleUpdatedMember.id,
    newMember.id,
  );

  // Step 4: Test combined update
  const finalEmail = typia.random<string & tags.Format<"email">>();
  const finalRole: IETodoRole = updatedRole.startsWith("admin")
    ? "member"
    : "admin";
  const combinedUpdateData = {
    memberId: newMember.id,
    body: {
      email: finalEmail,
      role: finalRole,
    } satisfies ITodoMember.IUpdate,
  };

  const finalUpdatedMember = await api.functional.todo.member.members.update(
    connection,
    combinedUpdateData,
  );
  typia.assert(finalUpdatedMember);

  // Validate both fields updated correctly
  TestValidator.equals(
    "email should have final updated value",
    finalUpdatedMember.email,
    finalEmail,
  );
  TestValidator.equals(
    "role should have final updated value",
    finalUpdatedMember.role,
    finalRole,
  );
  TestValidator.equals(
    "member ID should remain unchanged",
    finalUpdatedMember.id,
    newMember.id,
  );

  // Step 5: Test with different role values
  const roles = ["member", "admin"] as const;
  const randomRole = RandomGenerator.pick(roles);
  const roleTestUpdateData = {
    memberId: newMember.id,
    body: {
      role: randomRole,
    } satisfies ITodoMember.IUpdate,
  };

  const roleTestUpdatedMember = await api.functional.todo.member.members.update(
    connection,
    roleTestUpdateData,
  );
  typia.assert(roleTestUpdatedMember);

  // Verify the role change applied correctly
  TestValidator.equals(
    "role should be set to randomly selected value",
    roleTestUpdatedMember.role,
    randomRole,
  );
  TestValidator.equals(
    "email should remain from previous update",
    roleTestUpdatedMember.email,
    finalEmail,
  );
  TestValidator.equals(
    "member ID should remain the same",
    roleTestUpdatedMember.id,
    newMember.id,
  );

  // Step 6: Verify data integrity across all operations
  TestValidator.equals(
    "final member ID matches original",
    finalUpdatedMember.id,
    newMember.id,
  );
  TestValidator.predicate("timestamp fields are present", () => {
    if (!finalUpdatedMember.created_at || !finalUpdatedMember.updated_at)
      return false;
    const created = new Date(finalUpdatedMember.created_at);
    const updated = new Date(finalUpdatedMember.updated_at);
    return updated >= created;
  });
}
