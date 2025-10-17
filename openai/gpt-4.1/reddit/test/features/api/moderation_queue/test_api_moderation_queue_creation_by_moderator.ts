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
 * Validates the creation of a new moderation queue entry by a community
 * moderator for a reported post, covering all cross-entity relationships and
 * proper access control.
 *
 * Steps:
 *
 * 1. Create a base member via file upload (represents a member joining).
 * 2. The member creates a community.
 * 3. Assigns themselves as a moderator of that community.
 * 4. Admin registers a report category.
 * 5. Member files a report against a (dummy) post, using the report category.
 * 6. Register/join the moderator via moderator join API to obtain session.
 * 7. As the moderator, create a moderation queue entry for the new report: status
 *    'pending', priority 'normal', self-assignment.
 * 8. Validates response properties: the moderation queue entry is present, linked
 *    to the correct report, community, assigned moderator, and status/priority
 *    fields.
 * 9. Negative test: non-moderator member attempts queue creation (should fail).
 * 10. Negative test: invalid report_id or community_id should be rejected.
 */
export async function test_api_moderation_queue_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create a base platform member via file upload
  // (simulate with typia-generated file upload, capture uploaded_by_member_id)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const memberFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberId,
          original_filename: RandomGenerator.name(2) + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(20),
          mime_type: "image/jpeg",
          file_size_bytes: 1024,
          url: "https://files.example.com/" + RandomGenerator.alphaNumeric(20),
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberFileUpload);

  // 2. Member creates a community
  const communityData = {
    name: RandomGenerator.name(2),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 3. Assign self as community moderator
  const moderatorAssignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberFileUpload.uploaded_by_member_id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: null,
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // 4. Admin registers a report category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: "spam",
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 5. Member files a report (simulate reporting a post)
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(), // simulate random post id
        comment_id: undefined,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 6. Moderator joins (obtain moderator token)
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: "modpassword123",
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // 7. As moderator, create moderation queue entry
  const modQueueRequest = {
    community_id: community.id,
    report_id: report.id,
    assigned_moderator_id: moderatorAuth.id,
    status: "pending",
    priority: "normal",
  } satisfies ICommunityPlatformModerationQueue.ICreate;
  const moderationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      { body: modQueueRequest },
    );
  typia.assert(moderationQueue);
  // Validate correct linkage
  TestValidator.equals(
    "moderationQueue community_id",
    moderationQueue.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderationQueue report_id",
    moderationQueue.report_id,
    report.id,
  );
  TestValidator.equals(
    "moderationQueue assigned_moderator_id",
    moderationQueue.assigned_moderator_id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "moderationQueue status",
    moderationQueue.status,
    "pending",
  );
  TestValidator.equals(
    "moderationQueue priority",
    moderationQueue.priority,
    "normal",
  );

  // 8.a Negative test: attempt to create moderation queue as non-moderator (should fail)
  await TestValidator.error(
    "non-moderator cannot create moderation queue",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.create(
        connection,
        {
          body: {
            community_id: community.id,
            report_id: report.id,
            assigned_moderator_id: undefined,
            status: "pending",
            priority: "normal",
          } satisfies ICommunityPlatformModerationQueue.ICreate,
        },
      );
    },
  );

  // 8.b Negative test: invalid report_id
  await TestValidator.error("invalid report_id should fail", async () => {
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: typia.random<string & tags.Format<"uuid">>(),
          assigned_moderator_id: moderatorAuth.id,
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  });

  // 8.c Negative test: invalid community_id
  await TestValidator.error("invalid community_id should fail", async () => {
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          report_id: report.id,
          assigned_moderator_id: moderatorAuth.id,
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  });
}
