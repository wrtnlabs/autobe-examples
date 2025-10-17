import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test that a moderator can update an existing moderation queue entry, covering
 * all prerequisites: community creation, member existence (via file upload),
 * moderator assignment, report category/report, and initial moderation queue
 * entry creation. Authentication is done as a moderator before update. The test
 * updates the moderation queue entry (status, assignment, priority), verifies
 * the update and audit log fields, checks permission enforcement, and confirms
 * error responses for invalid/unauthorized attempts.
 */
export async function test_api_moderation_queue_update_by_moderator(
  connection: api.IConnection,
) {
  // --- Prepare the prerequisites ---
  // 1. Create a file upload to ensure a member exists (simulate member existence)
  const fakeMemberId = typia.random<string & tags.Format<"uuid">>();
  const fileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: fakeMemberId,
          original_filename: RandomGenerator.paragraph({ sentences: 1 }),
          storage_key: RandomGenerator.alphaNumeric(20),
          mime_type: "image/png",
          file_size_bytes: 256,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(32)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 2. Create a community
  const communityCreateBody = {
    name: RandomGenerator.name(1),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Assign moderator for the community (simulate as a new member-moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  // 3a. Join as moderator
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        community_id: community.id,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderatorAuth);

  // 3b. Assign moderator role to a member
  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: fakeMemberId,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // 4. Create report category
  const reportCategory: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 5. Create a report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        report_category_id: reportCategory.id,
        post_id: typia.random<string & tags.Format<"uuid">>(),
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 6. Create moderation queue entry
  const queueEntry: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          assigned_moderator_id: moderatorAuth.id, // assign joined moderator as handler
          status: "pending",
          priority: RandomGenerator.pick(["normal", "high", "urgent"] as const),
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(queueEntry);

  // --- Test updating the moderation queue entry ---
  // Update status and assign to a different moderator (the member-assigned one)
  const updateBody = {
    status: "in_progress",
    assigned_moderator_id: moderatorAssignment.id,
    priority: "high",
    updated_at: new Date().toISOString(),
  } satisfies ICommunityPlatformModerationQueue.IUpdate;

  const updatedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.update(
      connection,
      {
        moderationQueueId: queueEntry.id,
        body: updateBody,
      },
    );
  typia.assert(updatedQueue);
  TestValidator.equals("moderation queue id", updatedQueue.id, queueEntry.id);
  TestValidator.equals(
    "status updated",
    updatedQueue.status,
    updateBody.status,
  );
  TestValidator.equals(
    "priority updated",
    updatedQueue.priority,
    updateBody.priority,
  );
  TestValidator.equals(
    "updated_at changed",
    updatedQueue.updated_at !== queueEntry.updated_at,
    true,
  );
  TestValidator.equals(
    "assigned moderator id updated",
    updatedQueue.assigned_moderator_id,
    updateBody.assigned_moderator_id,
  );

  // --- Error cases: unauthorized or invalid attempts ---
  // Attempt to update with insufficient permissions (simulate by not authenticating, or with wrong moderator id)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.update(
        unauthConn,
        {
          moderationQueueId: queueEntry.id,
          body: {
            status: "resolved",
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );

  // Attempt to perform an invalid status transition
  await TestValidator.error(
    "invalid status transition should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.update(
        connection,
        {
          moderationQueueId: queueEntry.id,
          body: {
            status: "nonexistent_status",
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
}
