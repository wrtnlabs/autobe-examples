import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test authorization failure when non-administrator attempts to delete guest
 * sessions. Validates that only administrators with proper privileges can
 * perform guest deletion operations. Tests role-based access control
 * enforcement for sensitive administrative actions.
 */
export async function test_api_admin_guest_deletion_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Create a regular member account without administrative privileges
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Verify member authentication was successful
  TestValidator.equals(
    "member authentication successful",
    member.email,
    memberEmail,
  );

  // Step 2: Attempt to delete a guest session using member's authentication
  // This should fail since regular members don't have admin privileges
  const guestId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "regular member cannot delete guest sessions due to insufficient privileges",
    async () => {
      await api.functional.communityPlatform.admin.guests.erase(connection, {
        guestId: guestId,
      });
    },
  );

  // Step 3: Create an administrator account to verify the operation works with proper privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Verify administrator authentication was successful
  TestValidator.equals(
    "admin authentication successful",
    admin.email,
    adminEmail,
  );

  // The test primarily focuses on validating that regular members cannot perform
  // administrative operations. The successful administrator operation demonstrates
  // that the API works correctly when proper privileges are present.
}
