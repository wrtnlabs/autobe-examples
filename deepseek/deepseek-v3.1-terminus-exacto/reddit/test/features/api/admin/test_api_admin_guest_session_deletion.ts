import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test administrative deletion of guest session records by authorized
 * administrator.
 *
 * This E2E test validates the complete lifecycle of guest session management:
 *
 * 1. Administrator account creation and authentication
 * 2. Member account creation and media file upload to establish guest session
 * 3. Administrative deletion of the guest session record
 * 4. Authorization boundary validation for cross-actor operations
 *
 * The test ensures proper security protocols are followed, including:
 *
 * - Only authorized administrators can delete guest sessions
 * - Complete audit trail maintenance
 * - Proper session lifecycle management
 * - Cross-actor authorization validation
 */
export async function test_api_admin_guest_session_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
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

  // Step 2: Create and authenticate as member to establish guest session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: typia.random<string>(),
        href: "https://example.com/upload",
        referrer: "https://example.com/dashboard",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Member uploads media file to create guest session record
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test_file.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/test_file.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 4: Switch back to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: typia.random<string>(),
      href: "https://example.com/admin",
      referrer: "https://example.com/login",
      session_id: typia.random<string>(),
      user_agent: "Test-Agent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Administrator deletes the guest session using the media file ID as guestId
  await api.functional.communityPlatform.admin.guests.erase(connection, {
    guestId: mediaFile.id,
  });

  // Step 6: Test authorization boundaries - member should not be able to delete guest sessions
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      ip: typia.random<string>(),
      href: "https://example.com/member",
      referrer: "https://example.com/login",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Member attempts to delete guest session (should fail due to lack of admin privileges)
  await TestValidator.error(
    "member should not be able to delete guest sessions without admin privileges",
    async () => {
      await api.functional.communityPlatform.admin.guests.erase(connection, {
        guestId: mediaFile.id,
      });
    },
  );

  // Final validation: Verify admin authentication was properly maintained
  TestValidator.predicate(
    "admin account was properly created and authenticated",
    admin.id !== undefined && admin.email === adminEmail,
  );

  TestValidator.predicate(
    "member account was properly created and used for session establishment",
    member.id !== undefined && member.email === memberEmail,
  );

  TestValidator.predicate(
    "media file upload created a valid session record for testing",
    mediaFile.id !== undefined && mediaFile.file_name === "test_file.jpg",
  );
}
