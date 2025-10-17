import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that an admin can retrieve moderator assignment details for a given
 * community and assignment ID, and that correct field values and business
 * linkages are returned. Ensures that only admins are permitted, and errors are
 * thrown for invalid context or permissions.
 *
 * 1. Register a new admin
 * 2. Register a new member
 * 3. Member creates a community
 * 4. Admin assigns the member as a moderator in the new community
 * 5. Admin retrieves moderator assignment details by IDs
 * 6. Validate all fields and business relationships
 * 7. Attempt to retrieve as non-admin (should fail)
 * 8. Attempt to retrieve with wrong community/assignment IDs (should fail)
 */
export async function test_api_admin_get_moderator_assignment_details_success(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
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

  // 2. Register member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);

  // 3. Member creates community
  // (Switch to member context)
  await api.functional.auth.member.join(
    { ...connection, headers: {} },
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    },
  ); // Refresh headers to ensure latest token
  const communityInput = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);

  // 4. Switch back to admin context to assign moderator
  await api.functional.auth.admin.join(
    { ...connection, headers: {} },
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    },
  ); // Reset headers to admin token
  const now = new Date().toISOString();
  const assignmentInput = {
    member_id: memberAuth.id,
    role: "moderator",
    start_at: now,
    note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;
  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: assignmentInput,
      },
    );
  typia.assert(assignment);

  // 5. Retrieve moderator assignment details as admin
  const read: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.at(
      connection,
      {
        communityId: community.id,
        assignmentId: assignment.id,
      },
    );
  typia.assert(read);

  // 6. Validate all returned business fields and linkages
  TestValidator.equals("community id matches", read.community_id, community.id);
  TestValidator.equals("member id matches", read.member_id, memberAuth.id);
  TestValidator.equals("role matches", read.role, assignmentInput.role);
  TestValidator.equals(
    "assigned_by_id must be admin",
    read.assigned_by_id,
    adminAuth.id,
  );
  TestValidator.equals("note matches", read.note, assignmentInput.note);
  TestValidator.equals(
    "start_at matches",
    read.start_at,
    assignmentInput.start_at,
  );

  // 7. Attempt to retrieve as non-admin (should fail)
  // Switch to member context (simulate fresh context/headers)
  await api.functional.auth.member.join(
    { ...connection, headers: {} },
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  await TestValidator.error(
    "non-admin cannot retrieve moderator assignment detail",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderatorAssignments.at(
        connection,
        {
          communityId: community.id,
          assignmentId: assignment.id,
        },
      );
    },
  );

  // 8. Revert to admin context and test invalid assignment/community ids
  await api.functional.auth.admin.join(
    { ...connection, headers: {} },
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    },
  );
  const bogusAssignmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error thrown if assignmentId does not exist",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderatorAssignments.at(
        connection,
        {
          communityId: community.id,
          assignmentId: bogusAssignmentId,
        },
      );
    },
  );
  const bogusCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error thrown if communityId does not match assignment",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderatorAssignments.at(
        connection,
        {
          communityId: bogusCommunityId,
          assignmentId: assignment.id,
        },
      );
    },
  );
}
