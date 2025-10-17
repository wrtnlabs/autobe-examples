import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate retrieval of a moderator assignment's detail in community context
 * (E2E):
 *
 * 1. Admin registers/join
 * 2. Member is created (by file upload as placeholder for member context)
 * 3. Member creates community (so is creator_member_id)
 * 4. Member is registered as moderator for the community
 * 5. Admin assigns moderator (using admin context)
 * 6. Moderator retrieves detail about their assignment (should succeed)
 * 7. Unauthorized access: access by random user (should fail)
 *
 * Steps exercise authentication, role-based linkage, access controls, and field
 * validation.
 */
export async function test_api_moderator_assignment_detail_view(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(10);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Member context -- we use file upload to create a placeholder member (simulate member join)
  const memberFile: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(),
          original_filename: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          storage_key: RandomGenerator.alphaNumeric(20),
          mime_type: "image/png",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          url: `https://files.example.com/${RandomGenerator.alphaNumeric(30)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberFile);
  const memberId: string & tags.Format<"uuid"> =
    memberFile.uploaded_by_member_id;

  // 3. Community creation (member context)
  // For simulation, create a new unique email for member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityTitle = RandomGenerator.paragraph({ sentences: 2 });
  const communityDescription = RandomGenerator.content({ paragraphs: 1 });
  // We assume API context is switched to member via memberId (simulate as needed)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: communityTitle,
          description: communityDescription,
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Moderator register: link member as moderator for this community (simulate member-moderator join)
  const moderatorPassword: string = RandomGenerator.alphaNumeric(10);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: memberEmail,
        password: moderatorPassword,
        community_id: community.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderator);

  // 5. Admin assigns moderator to the community
  // Switch API context back to admin (simulate admin login/session)
  // Assign as 'moderator', starting now
  const startAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const assignmentRole = "moderator";
  const assignmentNote = "Initial moderator assignment for test";
  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberId,
          role: assignmentRole,
          start_at: startAt,
          note: assignmentNote,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 6. Moderator retrieves assignment - should succeed
  const assignmentDetail: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.at(
      connection,
      {
        communityId: community.id,
        assignmentId: assignment.id,
      },
    );
  typia.assert(assignmentDetail);
  TestValidator.equals(
    "assignment community_id",
    assignmentDetail.community_id,
    community.id,
  );
  TestValidator.equals(
    "assignment member_id",
    assignmentDetail.member_id,
    memberId,
  );
  TestValidator.equals(
    "assignment role",
    assignmentDetail.role,
    assignmentRole,
  );
  TestValidator.equals(
    "assignment assigned_by_id",
    assignmentDetail.assigned_by_id,
    admin.id,
  );
  TestValidator.equals(
    "assignment start_at",
    assignmentDetail.start_at,
    startAt,
  );
  TestValidator.equals(
    "assignment note",
    assignmentDetail.note,
    assignmentNote,
  );

  // 7. Unauthorized access: random user tries to retrieve assignment (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot access moderator assignment detail",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.at(
        unauthConn,
        {
          communityId: community.id,
          assignmentId: assignment.id,
        },
      );
    },
  );
}
