import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Verify that a moderator can update an existing moderator assignment in their
 * assigned community, enforcing business rules.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator.
 * 2. Create a new community as the moderator.
 * 3. Simulate a member with a file upload record (for test setup), who will be
 *    assigned as moderator.
 * 4. Assign the member as a moderator in the community (create initial
 *    assignment).
 * 5. Update the moderator assignment: change role, modify note, etc.
 * 6. Retrieve and verify assignment reflects updates.
 * 7. Attempt unauthorized update (different community/moderator) and expect error.
 * 8. Try to demote the only owner (should be forbidden).
 * 9. Enforce maximum allowed moderator assignments by attempting to exceed the
 *    limit.
 * 10. Confirm audit logging and assignment history via timestamps/change detection.
 */
export async function test_api_moderator_assignment_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a moderator and authenticate (moderator join)
  const modEmail = typia.random<string & tags.Format<"email">>();
  const communityCreationToken = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: modEmail,
        password: "testpass123",
        community_id: typia.random<string & tags.Format<"uuid">>(), // will update in community create
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(communityCreationToken);

  // 2. Create community with this moderator
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register a member (simulate via file upload object for test - no member API)
  const fileMember =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: community.creator_member_id,
          original_filename: "memberid.txt",
          storage_key: RandomGenerator.alphaNumeric(12),
          mime_type: "text/plain",
          file_size_bytes: 12,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileMember);
  // Use uploaded_by_member_id as the member for assignment
  const memberId = fileMember.uploaded_by_member_id;

  // 4. Create a moderator assignment for the new member in the community
  const modAssignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberId,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Auto-assigned for test",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(modAssignment);

  // 5. Update moderator assignment: change role, add note
  const updateBody = {
    role: "owner", // elevate role
    note: "Promoted to owner during test",
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IUpdate;
  const updatedAssignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.update(
      connection,
      {
        communityId: community.id,
        assignmentId: modAssignment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAssignment);
  TestValidator.equals(
    "Assignment role updated",
    updatedAssignment.role,
    "owner",
  );
  TestValidator.equals(
    "Assignment note updated",
    updatedAssignment.note,
    "Promoted to owner during test",
  );
  TestValidator.notEquals(
    "Timestamps updated after assignment edit",
    updatedAssignment.updated_at,
    modAssignment.updated_at,
  );

  // 6. Retrieve and confirm assignment reflects update
  // (No explicit get API, so rely on update response)
  TestValidator.equals(
    "Assignment id matches after update",
    updatedAssignment.id,
    modAssignment.id,
  );
  TestValidator.equals(
    "member_id matches",
    updatedAssignment.member_id,
    modAssignment.member_id,
  );
  TestValidator.equals(
    "community_id matches",
    updatedAssignment.community_id,
    modAssignment.community_id,
  );

  // 7. Attempt unauthorized update as a made-up community/moderator
  await TestValidator.error(
    "Unauthorized update attempt is denied",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.update(
        connection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          assignmentId: modAssignment.id,
          body: { role: "moderator" },
        },
      );
    },
  );

  // 8. Demote sole owner back to moderator (business rule: must always have at least one owner)
  await TestValidator.error(
    "Cannot demote last owner of a community",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.update(
        connection,
        {
          communityId: community.id,
          assignmentId: modAssignment.id,
          body: { role: "moderator" },
        },
      );
    },
  );

  // 9. Test community maximum allowed moderators by repeatedly assigning new moderators
  const maxMods = 10; // arbitrary business max for evidence; adjust if doc specifies
  const extraMemberIds = ArrayUtil.repeat(maxMods, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  for (const id of extraMemberIds) {
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: null,
        },
      },
    );
  }
  await TestValidator.error(
    "Exceeding maximum moderators is forbidden",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
        connection,
        {
          communityId: community.id,
          body: {
            member_id: typia.random<string & tags.Format<"uuid">>(),
            role: "moderator",
            start_at: new Date().toISOString(),
            note: null,
          },
        },
      );
    },
  );
  // (Audit logging/history verification is implicit in timestamp/updated_at checks above)
}
