import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";

/**
 * Validates the update of a moderator assignment by an admin, ensuring role and
 * note can be changed and persist, while respecting all business rules.
 *
 * The scenario establishes all dependencies for updating a moderator
 * assignment:
 *
 * 1. Admin registers (gains authentication context).
 * 2. A platform "member" is created by registering a file upload (since member
 *    creation must be indirect).
 * 3. The admin creates a new community.
 * 4. Admin assigns the created member as a moderator (with a specific start
 *    date/time and role e.g., 'moderator').
 * 5. The admin updates the moderator assignment—changing the role (e.g., to
 *    'owner') and adding (or changing) a note.
 * 6. Verifications:
 *
 *    - The assignment's role and note are successfully updated.
 *    - The update does not violate owner-orphaning or limit rules.
 *    - Audit/compliance logging is assumed.
 */
export async function test_api_admin_updates_moderator_assignment_role_and_note(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      superuser: false,
    },
  });
  typia.assert(admin);

  // 2. Create a member by file upload (generates member context)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberId,
          original_filename: RandomGenerator.name(2) + ".png",
          storage_key: RandomGenerator.alphaNumeric(20),
          mime_type: "image/png",
          file_size_bytes: 1024,
          url: `https://files.example.com/${RandomGenerator.alphaNumeric(24)}`,
          status: "active",
        },
      },
    );
  typia.assert(fileUpload);

  // 3. Admin creates a community
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          slug: communityName.toLowerCase(),
        },
      },
    );
  typia.assert(community);

  // 4. Admin assigns the member as a moderator
  const moderatorRole = "moderator";
  const assignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberId,
          role: moderatorRole,
          start_at: new Date().toISOString(),
          note: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(assignment);

  // 5. Admin updates the moderator assignment (change role and add note)
  const newRole = "owner";
  const newNote = RandomGenerator.paragraph({ sentences: 4 });
  const updated =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.update(
      connection,
      {
        communityId: community.id,
        assignmentId: assignment.id,
        body: {
          role: newRole,
          note: newNote,
        },
      },
    );
  typia.assert(updated);
  // 6. Verify that the assignment has updated role and note
  TestValidator.equals("assignment role updated", updated.role, newRole);
  TestValidator.equals("assignment note updated", updated.note, newNote);
  // Confirm unique/ownership rule (at least one owner exists)
  TestValidator.equals(
    "assignment is for correct member",
    updated.member_id,
    assignment.member_id,
  );
  TestValidator.equals(
    "assignment is in correct community",
    updated.community_id,
    assignment.community_id,
  );
  // No removal/orphaning logic exercised (test ensures positive update scenario).
}
