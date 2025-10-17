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
 * Validate removal of a moderator assignment in a community as an admin.
 *
 * - Steps:
 *
 *   1. (Admin) Register a new admin (to get permission for moderator management).
 *   2. (Member) Create a community as a member (so the community exists, and an
 *        owner mod exists).
 *   3. (Member) Create a file upload for a member as "fake" user, to simulate a user
 *        who can be a moderator.
 *   4. (Admin) Assign the member as a moderator to the community via the admin API.
 *   5. (Admin) Remove the moderator assignment as admin using the erase endpoint.
 *   6. (Admin) Try to remove the same assignment again, expect error (already
 *        removed).
 *   7. (Admin) Try to remove a non-existent assignment, expect error.
 *   8. (Permission) Ensure non-admins cannot perform this operation (not possible
 *        with current API set, so skipped, as API only allows via admin
 *        route).
 *   9. (Business) Attempt to remove the last owner assignment; expect this to be
 *        forbidden (cannot simulate this directly — only possible if owner is
 *        the only mod, which is the case upon creation; skip direct removal as
 *        owner-forbidden check cannot be exercised without more complex
 *        flows).
 */
export async function test_api_admin_remove_moderator_assignment_from_community(
  connection: api.IConnection,
) {
  // 1. Join as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinResp: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestAdmin#1234!",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminJoinResp);

  // 2. Create a community as member: use a "fake" member's file upload as the target for moderation
  // (No member registration API, simulate member with file upload's uploaded_by_member_id)
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  // The community creator is an owner and should not be removed directly (see below for check)

  // 3. Create a file upload to use its uploaded_by_member_id as the simulated member
  const memberFileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(),
          original_filename: RandomGenerator.alphaNumeric(10) + ".png",
          storage_key: RandomGenerator.alphaNumeric(12),
          mime_type: "image/png",
          file_size_bytes: 2048,
          url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(16),
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberFileUpload);
  const simulatedMemberId = memberFileUpload.uploaded_by_member_id;

  // 4. Assign the simulated member as a moderator to the community
  //    Use "moderator" role so this is not the owner (which would block deletion)
  const modAssignResp: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: simulatedMemberId,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Test moderator assignment",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(modAssignResp);

  // 5. Remove the moderator assignment: should succeed
  await api.functional.communityPlatform.admin.communities.moderatorAssignments.erase(
    connection,
    {
      communityId: community.id,
      assignmentId: modAssignResp.id,
    },
  );
  // (No direct way to list all moderator assignments with given API, so we can't confirm removal via list—just that no error is thrown and normal business flow continues)

  // 6. Try to remove the same assignment again: expect error
  await TestValidator.error(
    "removing already removed assignment returns error",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderatorAssignments.erase(
        connection,
        {
          communityId: community.id,
          assignmentId: modAssignResp.id,
        },
      );
    },
  );

  // 7. Try to remove a random/non-existent assignment: expect error
  const nonExistentAssignmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "removing non-existent assignment returns error",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderatorAssignments.erase(
        connection,
        {
          communityId: community.id,
          assignmentId: nonExistentAssignmentId,
        },
      );
    },
  );

  // 8. (Permissions) Non-admins cannot use admin endpoints — test skipped due to unavailable non-admin API for this operation.
  // 9. (Owner removal prevention) The API by design should prevent removal of the last owner mod; as per current API, the initial owner is set at creation, so direct test of this forbidden operation is skipped (would require more assignment/removal APIs).
}
