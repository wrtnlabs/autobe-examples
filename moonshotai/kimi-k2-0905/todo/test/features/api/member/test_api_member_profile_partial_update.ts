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
): Promise<void> {
  // Step 1: Create a new member account for testing
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: originalEmail,
      password: "strongPassword123",
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member);

  // Step 2: Verify initial member state
  TestValidator.equals("initial member email", member.email, originalEmail);
  TestValidator.equals("initial member role", member.role, "member");

  // Step 3: Update only email field (partial update)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedMember = await api.functional.todo.member.members.update(
    connection,
    {
      memberId: member.id,
      body: {
        email: newEmail,
      } satisfies ITodoMember.IUpdate,
    },
  );
  typia.assert(updatedMember);

  // Step 4: Verify email was updated while role remained unchanged
  TestValidator.equals("member ID preserved", updatedMember.id, member.id);
  TestValidator.equals(
    "email updated correctly",
    updatedMember.email,
    newEmail,
  );
  TestValidator.equals(
    "role preserved from original",
    updatedMember.role,
    member.role,
  );
  TestValidator.notEquals(
    "email different from original",
    updatedMember.email,
    member.email,
  );

  // Step 5: Update only role field (partial update)
  const roleUpdatedMember = await api.functional.todo.member.members.update(
    connection,
    {
      memberId: member.id,
      body: {
        role: "admin",
      } satisfies ITodoMember.IUpdate,
    },
  );
  typia.assert(roleUpdatedMember);

  // Step 6: Verify role was updated while email remained the same
  TestValidator.equals("member ID preserved", roleUpdatedMember.id, member.id);
  TestValidator.equals(
    "email preserved from previous update",
    roleUpdatedMember.email,
    newEmail,
  );
  TestValidator.equals(
    "role updated to admin",
    roleUpdatedMember.role,
    "admin",
  );
  TestValidator.notEquals(
    "role different from original",
    roleUpdatedMember.role,
    member.role,
  );

  // Step 7: Update both email and role in single partial update
  const finalEmail = typia.random<string & tags.Format<"email">>();
  const finalMember = await api.functional.todo.member.members.update(
    connection,
    {
      memberId: member.id,
      body: {
        email: finalEmail,
        role: null,
      } satisfies ITodoMember.IUpdate,
    },
  );
  typia.assert(finalMember);

  // Step 8: Verify both fields updated simultaneously
  TestValidator.equals("member ID preserved", finalMember.id, member.id);
  TestValidator.equals("final email updated", finalMember.email, finalEmail);
  TestValidator.equals("final role cleared to null", finalMember.role, null);

  // Step 9: Test error case - non-existent member ID
  const fakeMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent member should fail",
    async () => {
      await api.functional.todo.member.members.update(connection, {
        memberId: fakeMemberId,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies ITodoMember.IUpdate,
      });
    },
  );

  // Step 10: Test empty update body (no fields specified) - should preserve current values
  const unchangedMember = await api.functional.todo.member.members.update(
    connection,
    {
      memberId: member.id,
      body: {} satisfies ITodoMember.IUpdate,
    },
  );
  typia.assert(unchangedMember);

  TestValidator.equals(
    "member unchanged with empty update body",
    unchangedMember.email,
    finalEmail,
  );
  TestValidator.equals(
    "member unchanged with empty update body",
    unchangedMember.role,
    null,
  );
}
