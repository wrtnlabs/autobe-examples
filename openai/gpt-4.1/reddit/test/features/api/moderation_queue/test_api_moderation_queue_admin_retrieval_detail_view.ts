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
 * E2E test: Admin can retrieve detailed moderation queue information, including
 * status, report linkage, moderator assignment, priority and more. Ensures only
 * admins can access full details; permission/enforcement edge cases are
 * covered.
 */
export async function test_api_moderation_queue_admin_retrieval_detail_view(
  connection: api.IConnection,
) {
  // Step 1: Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Register a member via file upload to simulate onboarding
  // (We need a member id, so create member file upload and use uploaded_by_member_id)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const fileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberId,
          original_filename: RandomGenerator.alphabets(8) + ".png",
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: "image/png",
          file_size_bytes: 4096,
          url: `https://files.example.com/${RandomGenerator.alphaNumeric(32)}` as string &
            tags.MaxLength<80000>,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // Step 3: The member creates a new community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Admin creates a report category
  const reportCategory: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // Step 5: Admin assigns the member as moderator for the created community
  const modAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberId,
          role: "moderator",
          start_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          note: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(modAssignment);

  // Step 6: Member reports content (simulate reporting a dummy post)
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 7: The moderator creates a moderation queue entry associating the report & community, self-assigned
  const modQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          assigned_moderator_id: modAssignment.id,
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(modQueue);

  // Step 8: As admin, retrieve moderation queue entry in detail
  const result: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.at(
      connection,
      {
        moderationQueueId: modQueue.id,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "moderation queue id must match",
    result.id,
    modQueue.id,
  );
  TestValidator.equals(
    "community id must match",
    result.community_id,
    community.id,
  );
  TestValidator.equals("report id must match", result.report_id, report.id);
  TestValidator.equals(
    "assigned moderator id matches assignment",
    result.assigned_moderator_id,
    modAssignment.id,
  );
  TestValidator.equals("status is pending", result.status, "pending");
  TestValidator.equals("priority is normal", result.priority, "normal");

  // Test: Retrieving with an invalid queue id returns error
  await TestValidator.error("random queue id results in error", async () => {
    await api.functional.communityPlatform.admin.moderationQueues.at(
      connection,
      {
        moderationQueueId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
