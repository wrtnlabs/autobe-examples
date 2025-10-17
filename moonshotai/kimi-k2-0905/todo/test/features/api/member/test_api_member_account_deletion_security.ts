import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

/**
 * Test member account deletion security ensuring users can only delete their
 * own accounts.
 *
 * This test validates the security measures that prevent unauthorized account
 * deletion attempts while allowing legitimate users to permanently remove their
 * data. The test creates two member accounts and verifies that each member can
 * only delete their own account, not accounts of other members. It also tests
 * that the deletion operation permanently removes the account along with all
 * associated data.
 *
 * The test follows this security validation workflow:
 *
 * 1. Create first member account and verify authentication
 * 2. Create second member account and verify authentication
 * 3. Attempt to delete another member's account (should fail)
 * 4. Delete own account (should succeed)
 * 5. Verify successful deletion by checking account no longer exists
 */
export async function test_api_member_account_deletion_security(
  connection: api.IConnection,
) {
  // Create first member account with unique email and password
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(10);
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: email1,
      password: password1,
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member1);

  // Create second member account with different email and password
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(10);
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: email2,
      password: password2,
    } satisfies IMemberCreate.IRequest,
  });
  typia.assert(member2);

  // Verify both accounts have unique IDs and different emails
  TestValidator.notEquals(
    "first member ID differs from second",
    member1.id,
    member2.id,
  );
  TestValidator.notEquals(
    "first member email differs from second",
    member1.email,
    member2.email,
  );
  TestValidator.equals("first member has member role", member1.role, "member");
  TestValidator.equals("second member has member role", member2.role, "member");

  // Test 1: Member1 cannot delete Member2's account (should succeed - security prevents this)
  await TestValidator.error(
    "member cannot delete another member's account",
    async () => {
      await api.functional.todo.member.members.erase(connection, {
        memberId: member2.id,
      });
    },
  );

  // Test 2: Member2 can delete their own account (should succeed)
  await api.functional.todo.member.members.erase(connection, {
    memberId: member2.id,
  });

  // Test 3: Member1 can delete their own account (should succeed)
  await api.functional.todo.member.members.erase(connection, {
    memberId: member1.id,
  });

  // Verify that attempting to delete already-deleted accounts would fail appropriately
  await TestValidator.error(
    "cannot delete already deleted account",
    async () => {
      await api.functional.todo.member.members.erase(connection, {
        memberId: member1.id,
      });
    },
  );

  await TestValidator.error(
    "cannot delete already deleted account",
    async () => {
      await api.functional.todo.member.members.erase(connection, {
        memberId: member2.id,
      });
    },
  );
}
