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
 * Validate admin creation of a moderation queue for a reported piece of
 * content.
 *
 * Workflow:
 *
 * 1. Admin registers and is authenticated
 * 2. Member is established via file upload (extract member from
 *    uploaded_by_member_id)
 * 3. Member creates a community
 * 4. Admin assigns this member as a moderator for the community
 * 5. Admin creates a new report category (free-text enabled)
 * 6. Member files a report for a (simulated) post in that community
 * 7. Admin creates the moderation queue, linking community, report, and optional
 *    moderator
 *
 * The test asserts the moderation queue is created correctly, references are
 * valid, and permission boundaries and edge cases (missing relationships, bad
 * references) are handled.
 */
export async function test_api_moderation_queue_creation_by_admin_for_reported_content(
  connection: api.IConnection,
) {
  // 1. Register/admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "securePassword123!",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Simulate member creation: File upload (gets us uploaded_by_member_id)
  const uploaded_by_member_id = typia.random<string & tags.Format<"uuid">>();
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id,
          original_filename: RandomGenerator.name(1) + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(16),
          mime_type: "image/jpeg",
          file_size_bytes: 2048,
          url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 3. Member creates a new community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 4. Admin assigns member to moderator
  const moderatorAssignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: uploaded_by_member_id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Auto test - initial mod",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // 5. Admin creates a report category
  const reportCategoryBody = {
    name: "Harassment" + RandomGenerator.alphabets(5),
    allow_free_text: true,
  } satisfies ICommunityPlatformReportCategory.ICreate;
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: reportCategoryBody,
      },
    );
  typia.assert(reportCategory);

  // 6. Member files a report for a fake post
  const fakePostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reportBody = {
    post_id: fakePostId,
    report_category_id: reportCategory.id,
    reason_text: "Spam/abuse test report",
  } satisfies ICommunityPlatformReport.ICreate;
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);

  // 7. Admin submits moderation queue creation (with moderator assignment)
  const queueBodyWithModerator = {
    community_id: community.id,
    report_id: report.id,
    assigned_moderator_id: uploaded_by_member_id,
    status: "pending",
    priority: "normal",
  } satisfies ICommunityPlatformModerationQueue.ICreate;
  const queueEntry =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: queueBodyWithModerator,
      },
    );
  typia.assert(queueEntry);
  TestValidator.equals(
    "queue community_id",
    queueEntry.community_id,
    community.id,
  );
  TestValidator.equals("queue report_id", queueEntry.report_id, report.id);
  TestValidator.equals(
    "queue assigned_moderator_id",
    queueEntry.assigned_moderator_id,
    uploaded_by_member_id,
  );
  TestValidator.equals("queue status", queueEntry.status, "pending");
  TestValidator.equals("queue priority", queueEntry.priority, "normal");

  // 8. Admin submits moderation queue creation (without moderator assignment)
  const queueBodyNoModerator = {
    community_id: community.id,
    report_id: report.id,
    status: "pending",
    priority: "high",
  } satisfies ICommunityPlatformModerationQueue.ICreate;
  const queueEntryNoMod =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: queueBodyNoModerator,
      },
    );
  typia.assert(queueEntryNoMod);
  TestValidator.equals(
    "queue without mod assigned",
    queueEntryNoMod.assigned_moderator_id,
    null,
  );
  TestValidator.equals(
    "queue without mod status",
    queueEntryNoMod.status,
    "pending",
  );
  TestValidator.equals(
    "queue without mod priority",
    queueEntryNoMod.priority,
    "high",
  );

  // 9. Error case: Try to create with bad references (should fail)
  await TestValidator.error("fail on nonexistent community_id", async () => {
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          report_id: report.id,
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  });
  await TestValidator.error("fail on nonexistent report_id", async () => {
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: typia.random<string & tags.Format<"uuid">>(),
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  });
  // 10. Error: only an admin can create moderation queue (simulate unauthorized by not calling admin join)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "only admin may create moderation queue",
    async () => {
      await api.functional.communityPlatform.admin.moderationQueues.create(
        unauthConn,
        {
          body: queueBodyWithModerator,
        },
      );
    },
  );
}
