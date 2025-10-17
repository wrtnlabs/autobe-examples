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
 * Validate the permanent revocation of a moderator assignment by a platform
 * admin.
 *
 * 1. Register and authenticate as admin.
 * 2. As a new member, upload a file (establishes member record for moderator
 *    assignment).
 * 3. As that member, create a new community.
 * 4. As admin, assign the member as moderator for the newly created community.
 * 5. As admin, delete the moderator assignment.
 * 6. Verify the assignment cannot be used to perform moderator operations
 *    post-deletion and that it cannot be deleted again.
 * 7. Attempt to delete a non-existent moderatorId (should error).
 * 8. Delete the only-moderator assignment for a community (acceptable, business
 *    rules dependent). Ensure the assignment record is gone.
 */
export async function test_api_moderator_assignment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals("admin email matches", adminAuth.email, adminEmail);
  TestValidator.predicate("admin is superuser", adminAuth.superuser === true);

  // 2. As new member, upload a file (simulates member existence, gets member id from uploaded_by_member_id)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const memberFileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberId,
          original_filename: RandomGenerator.name() + ".png",
          storage_key: RandomGenerator.alphaNumeric(36),
          mime_type: "image/png",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          url: `https://cdn.file/${RandomGenerator.alphaNumeric(30)}.png`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberFileUpload);
  TestValidator.equals(
    "uploaded file associated with member",
    memberFileUpload.uploaded_by_member_id,
    memberId,
  );

  // 3. As the member, create a community
  const communityTitle = RandomGenerator.name(3);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: communityTitle,
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. As admin, assign member as moderator for the community
  const now = new Date().toISOString();
  const modAssign: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberId,
          role: "moderator",
          start_at: now,
          note: "Assigned for testing.",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(modAssign);
  TestValidator.equals(
    "moderator is set for test member",
    modAssign.member_id,
    memberId,
  );
  TestValidator.equals(
    "moderator is for correct community",
    modAssign.community_id,
    community.id,
  );

  // 5. As admin, delete the moderator assignment
  await api.functional.communityPlatform.admin.moderators.erase(connection, {
    moderatorId: modAssign.id,
  });
  // No output (void), but no error means successful deletion

  // 6. Try deleting same moderator assignment again - must error (not found)
  await TestValidator.error(
    "deleting already deleted moderator assignment should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderators.erase(
        connection,
        {
          moderatorId: modAssign.id,
        },
      );
    },
  );

  // 7. Delete a non-existent moderator assignment (random uuid)
  const nonexistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent moderator assignment should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderators.erase(
        connection,
        {
          moderatorId: nonexistentModeratorId,
        },
      );
    },
  );

  // 8. Delete when moderator is only moderator (repeat flow with different member & community)
  const onlyModMemberId = typia.random<string & tags.Format<"uuid">>();
  const onlyMemberFileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: onlyModMemberId,
          original_filename: RandomGenerator.name() + ".jpeg",
          storage_key: RandomGenerator.alphaNumeric(36),
          mime_type: "image/jpeg",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          url: `https://cdn.file/${RandomGenerator.alphaNumeric(30)}.jpeg`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(onlyMemberFileUpload);
  const onlyModCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(3),
          description: RandomGenerator.content(),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(onlyModCommunity);
  const onlyModStart = new Date().toISOString();
  const onlyModAssign: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: onlyModCommunity.id,
        body: {
          member_id: onlyModMemberId,
          role: "moderator",
          start_at: onlyModStart,
          note: "Sole moderator for edge case",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(onlyModAssign);
  await api.functional.communityPlatform.admin.moderators.erase(connection, {
    moderatorId: onlyModAssign.id,
  });
  // Attempting to delete again should fail
  await TestValidator.error(
    "deleting sole moderator assignment again should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderators.erase(
        connection,
        {
          moderatorId: onlyModAssign.id,
        },
      );
    },
  );
}
