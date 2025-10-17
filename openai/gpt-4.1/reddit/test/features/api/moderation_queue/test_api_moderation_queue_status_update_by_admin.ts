import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test the ability of an admin to update moderation queue entries including
 * status transition, moderator assignment, and priority changes.
 *
 * Steps:
 *
 * 1. Register and authenticate as platform admin.
 * 2. Create a report category (for abuse/spam/etc.).
 * 3. Simulate a member by uploading a file (to get a member id).
 * 4. Create a community, using the created member's id as creator.
 * 5. File a report as the member.
 * 6. Assign a moderator by the admin to the newly created community.
 * 7. Create a moderation queue entry as the admin.
 * 8. Update the moderation queue: change status to 'in_progress', re-assign a
 *    different moderator, change priority.
 * 9. Assert that the updated queue object reflects these changes.
 * 10. Attempt unauthorized update (as member, not admin) and assert error.
 * 11. Try invalid status values or illegal transitions and assert error.
 * 12. Attempt to update non-existent moderation queue and assert error.
 *
 * The test ensures only admins can update, changes are auditable, and business
 * rules are strictly enforced.
 */
export async function test_api_moderation_queue_status_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strong-password-!@#",
        superuser: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a report category
  const category: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 12,
          }),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Simulate a member by uploading a file
  const memberUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(),
          original_filename: "avatar.jpg",
          storage_key: RandomGenerator.alphaNumeric(24),
          mime_type: "image/jpeg",
          file_size_bytes: 12345,
          url: `https://example.com/file/${RandomGenerator.alphaNumeric(16)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberUpload);

  // 4. Create a community (by the member)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 3,
            wordMax: 15,
          }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. File a report as the member (simulate as member)
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: category.id,
        reason_text: "Test abuse report.",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 6. Assign a moderator (admin assigns member to be a moderator)
  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberUpload.uploaded_by_member_id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Initial assignment for test.",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 7. Create a moderation queue entry
  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          assigned_moderator_id: assignment.id,
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(moderationQueue);

  // 8. Update the moderation queue (change status, assigned moderator, priority)
  // Simulate new moderator by new assignment
  const newModeratorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Reassigned moderator.",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(newModeratorAssignment);

  // Update: status -> in_progress, assigned_moderator_id -> new, priority -> urgent
  const updated =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: moderationQueue.id,
        body: {
          status: "in_progress",
          assigned_moderator_id: newModeratorAssignment.id,
          priority: "urgent",
          updated_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "moderation queue updated status",
    updated.status,
    "in_progress",
  );
  TestValidator.equals(
    "moderation queue updated moderator",
    updated.assigned_moderator_id,
    newModeratorAssignment.id,
  );
  TestValidator.equals(
    "moderation queue updated priority",
    updated.priority,
    "urgent",
  );

  // 9. Attempt to update as unauthorized (simulate as member, should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.communityPlatform.admin.moderationQueues.update(
      unauthConn,
      {
        moderationQueueId: moderationQueue.id,
        body: {
          status: "resolved",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  });

  // 10. Try illegal status transition (e.g., from resolved back to pending)
  // First, set to resolved
  const resolved =
    await api.functional.communityPlatform.admin.moderationQueues.update(
      connection,
      {
        moderationQueueId: moderationQueue.id,
        body: {
          status: "resolved",
          updated_at: new Date().toISOString(),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(resolved);
  TestValidator.equals("resolved state set", resolved.status, "resolved");
  // Attempt invalid transition
  await TestValidator.error(
    "illegal status transition should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderationQueues.update(
        connection,
        {
          moderationQueueId: moderationQueue.id,
          body: {
            status: "pending",
            updated_at: new Date().toISOString(),
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );

  // 11. Attempt to assign non-existent moderator
  await TestValidator.error(
    "assigning non-existent moderator should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderationQueues.update(
        connection,
        {
          moderationQueueId: moderationQueue.id,
          body: {
            assigned_moderator_id: typia.random<string & tags.Format<"uuid">>(),
            updated_at: new Date().toISOString(),
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );

  // 12. Attempt to update non-existent moderation queue
  await TestValidator.error(
    "updating non-existent moderation queue",
    async () => {
      await api.functional.communityPlatform.admin.moderationQueues.update(
        connection,
        {
          moderationQueueId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "in_progress",
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
}
