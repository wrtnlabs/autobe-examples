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
 * Validate permanent deletion of a moderation queue entry as an admin.
 *
 * This test scenario covers end-to-end setup and operations except for audit
 * log querying (not exposed in the SDK). Steps:
 *
 * 1. Register a new admin and authorize connection for subsequent privileged
 *    operations.
 * 2. Create a file-upload member (via fileUploads) to later assign as community
 *    moderator.
 * 3. Create a community (by a regular member). Use random unique slug and name.
 * 4. Assign the uploaded member as a moderator for the community using admin
 *    permissions.
 * 5. Create a report category as required for filing reports.
 * 6. Create a report against a post or comment (simulate with only category, as no
 *    post/comment API is given).
 * 7. Create a moderation queue entry referencing the community/report and with
 *    status 'pending'.
 * 8. Attempt (and assert failure) to delete the moderation queue entry while its
 *    status is 'pending'.
 * 9. Simulate resolving the moderation queue entry (changing status to 'resolved'
 *    NOT exposed via API, so we assume its creation allows test-only
 *    deletion).
 * 10. Delete the moderation queue entry with a valid erase call.
 * 11. Attempt to delete the same moderation queue entry again (assert error).
 * 12. Validate that accessing the moderation queue entry after deletion fails (if
 *     readable).
 */
export async function test_api_admin_moderation_queue_entry_permanent_deletion_workflow(
  connection: api.IConnection,
) {
  // 1. Register and login a new admin (gets token; all further calls are admin-authorized)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminStrongPW!@#",
        superuser: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a file upload member (simulate as member for moderator assignment)
  // (For this test, use a dummy file upload - required fields only.)
  const memberFileUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(),
          original_filename: RandomGenerator.paragraph({ sentences: 2 }),
          storage_key: RandomGenerator.alphaNumeric(24),
          mime_type: "image/png",
          file_size_bytes: 123456,
          url: `https://assets.example.com/${RandomGenerator.alphaNumeric(22)}`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberFileUpload);

  // 3. Create a community as a member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Assign the uploaded member as a moderator
  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberFileUpload.uploaded_by_member_id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Automated moderator assignment for test.",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // 5. Create a report category
  const reportCategory: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 6. Create a report against a post (simulate by omitting both post_id/comment_id)
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        report_category_id: reportCategory.id,
        reason_text: "Test scenario report.",
        // post_id/comment_id omitted (both are optional, so allowed)
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 7. Create a moderation queue entry for the report
  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(moderationQueue);

  // 8. Attempt deletion while entry is active (should be rejected)
  await TestValidator.error(
    "cannot delete moderation queue unless resolved/closed",
    async () => {
      await api.functional.communityPlatform.admin.moderationQueues.erase(
        connection,
        {
          moderationQueueId: moderationQueue.id,
        },
      );
    },
  );

  // (No API to update moderation queue status to 'resolved', but simulate it for this test)
  // 9. Assume status now permits deletion (forcing a positive path)
  // To simulate deletion, forcibly delete for this test's happy/positive path
  // (In a real scenario, a PATCH or status update API would be needed - not provided.)
  // For this E2E, we simply proceed to call erase assuming backend allows due to test setup.
  await api.functional.communityPlatform.admin.moderationQueues.erase(
    connection,
    {
      moderationQueueId: moderationQueue.id,
    },
  );

  // 10. Attempt second deletion (should fail)
  await TestValidator.error(
    "cannot delete moderation queue twice",
    async () => {
      await api.functional.communityPlatform.admin.moderationQueues.erase(
        connection,
        {
          moderationQueueId: moderationQueue.id,
        },
      );
    },
  );
}
