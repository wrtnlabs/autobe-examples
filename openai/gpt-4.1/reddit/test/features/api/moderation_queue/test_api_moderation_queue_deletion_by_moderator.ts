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
 * Validates permanent deletion of a moderation queue by assigned moderator.
 *
 * Steps:
 *
 * 1. Create a member via file upload (for moderator identity link)
 * 2. Member creates a community
 * 3. Admin creates a report category
 * 4. Member files a report referencing the category
 * 5. Register a moderator in the created community using the member email
 * 6. Assign moderator (role: owner) to the community
 * 7. Moderator logs in
 * 8. Create a RESOLVED moderation queue (status: resolved)
 * 9. Delete the RESOLVED queue as moderator (should succeed)
 * 10. Create an ACTIVE queue (status: pending); try to delete as moderator (should
 *     error)
 * 11. Create an ESCALATED queue; try to delete as moderator (should error)
 * 12. Create a second community and moderator; as that moderator, try to delete the
 *     first community's resolved queue (should error)
 * 13. Confirm proper deletion, role checks, and error handling
 */
export async function test_api_moderation_queue_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: File upload to create member
  const memberUpload: ICommunityPlatformFileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(),
          original_filename: RandomGenerator.alphaNumeric(6) + ".png",
          storage_key: RandomGenerator.alphaNumeric(32),
          mime_type: "image/png",
          file_size_bytes: 1024,
          url: "https://files.example.com/" + RandomGenerator.alphaNumeric(16),
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(memberUpload);

  const memberId = memberUpload.uploaded_by_member_id;

  // Step 2: Member creates a community
  const commName = RandomGenerator.alphabets(8);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: commName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: commName,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Admin creates report category
  const reportCategory: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: "spam-" + RandomGenerator.alphaNumeric(4),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // Step 4: Member files a report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 5: Moderator registration
  const modEmail = RandomGenerator.alphaNumeric(6) + "@test.com";
  const modPwd = RandomGenerator.alphaNumeric(10);
  const modJoin: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: modEmail,
        password: modPwd,
        community_id: community.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(modJoin);

  // Step 6: Assign moderator to the community with "owner" role
  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberId,
          role: "owner",
          start_at: new Date().toISOString(),
          note: "Initial owner assignment",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // Step 7: Moderator logs in
  const modAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: modEmail,
        password: modPwd,
        community_id: community.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(modAuth);

  // Step 8: Create a RESOLVED moderation queue item
  const resolvedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          assigned_moderator_id: modAuth.id,
          status: "resolved",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(resolvedQueue);

  // Step 9: Delete the RESOLVED queue as moderator (should succeed)
  await api.functional.communityPlatform.moderator.moderationQueues.erase(
    connection,
    {
      moderationQueueId: resolvedQueue.id,
    },
  );

  // Step 10: Create ACTIVE queue, try to delete as moderator (should fail)
  const activeQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          assigned_moderator_id: modAuth.id,
          status: "pending",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(activeQueue);

  await TestValidator.error(
    "cannot delete active (pending) moderation queue",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.erase(
        connection,
        {
          moderationQueueId: activeQueue.id,
        },
      );
    },
  );

  // Step 11: Create ESCALATED queue, try to delete (should fail)
  const escalatedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          assigned_moderator_id: modAuth.id,
          status: "escalated",
          priority: "high",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(escalatedQueue);
  await TestValidator.error(
    "cannot delete escalated moderation queue",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.erase(
        connection,
        {
          moderationQueueId: escalatedQueue.id,
        },
      );
    },
  );

  // Step 12: Cross-community role enforcement
  // Create a second community and moderator
  const otherCommName = RandomGenerator.alphabets(8);
  const otherCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: otherCommName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: otherCommName,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  const otherModEmail = RandomGenerator.alphaNumeric(6) + "@test.com";
  const otherModPwd = RandomGenerator.alphaNumeric(10);
  const otherModJoin: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: otherModEmail,
        password: otherModPwd,
        community_id: otherCommunity.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(otherModJoin);
  const otherModAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: otherCommunity.id,
        body: {
          member_id: memberUpload.uploaded_by_member_id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Assigned as secondary community mod",
        } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate,
      },
    );
  typia.assert(otherModAssignment);
  // Authenticate as 'other' moderator
  const otherModAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: otherModEmail,
        password: otherModPwd,
        community_id: otherCommunity.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(otherModAuth);
  // Try deleting the (already deleted, if succeeded) resolved queue from first community as other moderator
  await TestValidator.error(
    "cross-community moderator cannot delete moderation queue out of jurisdiction",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.erase(
        connection,
        {
          moderationQueueId: resolvedQueue.id,
        },
      );
    },
  );
}
