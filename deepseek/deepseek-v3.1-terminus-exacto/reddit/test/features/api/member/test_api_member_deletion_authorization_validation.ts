import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test authorization validation for member deletion operations.
 *
 * This test validates that only administrators can perform soft deletions of
 * member accounts, ensuring proper role-based access control. It tests the
 * security boundaries between regular member operations and administrative
 * functions, confirming that deletion operations require appropriate
 * administrative privileges.
 *
 * The test creates both administrator and member accounts, then verifies that:
 *
 * 1. Administrators can successfully soft delete members
 * 2. Regular members cannot delete other members (authorization failure)
 * 3. Soft deletion correctly sets the deleted_at timestamp
 * 4. Role-based access control is properly enforced
 */
export async function test_api_member_deletion_authorization_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with deletion authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account that will be targeted for deletion
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Verify administrator can successfully soft delete member
  const deletedMember: ICommunityPlatformMember =
    await api.functional.communityPlatform.admin.members.erase(connection, {
      memberId: member.id,
    });
  typia.assert(deletedMember);

  // Validate soft deletion sets deleted_at timestamp correctly
  TestValidator.predicate(
    "soft deletion should set deleted_at timestamp",
    deletedMember.deleted_at !== null && deletedMember.deleted_at !== undefined,
  );

  TestValidator.equals(
    "deleted member ID should match original member ID",
    deletedMember.id,
    member.id,
  );

  // Step 4: Create a new member account to test member permissions
  const testMemberEmail = typia.random<string & tags.Format<"email">>();
  const testMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: testMemberEmail,
        password: "TestMemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(testMember);

  // Step 5: Test that regular member cannot delete other members (authorization failure)
  // Attempt deletion should fail due to insufficient privileges
  await TestValidator.error(
    "regular member should not be able to delete other members",
    async () => {
      await api.functional.communityPlatform.admin.members.erase(connection, {
        memberId: member.id,
      });
    },
  );

  // Step 6: Switch back to admin context to verify system state
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // Final validation: Ensure the originally deleted member remains deleted
  TestValidator.predicate(
    "originally deleted member should remain deleted",
    deletedMember.deleted_at !== null && deletedMember.deleted_at !== undefined,
  );
}
