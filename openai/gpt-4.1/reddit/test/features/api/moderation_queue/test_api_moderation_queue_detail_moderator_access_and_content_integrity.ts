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
 * Validate moderator-detail moderation queue retrieval, including setup,
 * assignment, business rule, and access control checks. Steps:
 *
 * 1. Create a member via file upload, extract uploaded_by_member_id
 * 2. Create a community as member
 * 3. Admin creates a report category
 * 4. Member files a report on a (synthetic) post in the community using report
 *    category
 * 5. Moderator registers via join (email must match the member email)
 * 6. Assign moderator to community via moderatorAssignments create
 * 7. Moderator creates a moderation queue entry for that report
 *    (assigned_moderator_id is their id, status/piority random strings; should
 *    use valid enums in real system)
 * 8. Fetch queue entry as assigned moderator and verify all fields (status,
 *    assigned_moderator_id, report_id, community_id, priority, timestamps)
 * 9. Create another community, moderator does not assign themselves to it, create
 *    a different queue entry there, then attempt to fetch its moderationQueueId
 *    as the first moderator (should fail authorization)
 */
export async function test_api_moderation_queue_detail_moderator_access_and_content_integrity(
  connection: api.IConnection,
) {
  // 1. Create a member by uploading a file to extract member id
  const email = typia.random<string & tags.Format<"email">>();
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: typia.random<string & tags.Format<"uuid">>(), // not used for authentication, so generate random
          original_filename: RandomGenerator.alphabets(8) + ".png",
          storage_key: RandomGenerator.alphaNumeric(18),
          mime_type: "image/png",
          file_size_bytes: 1000,
          url: "https://test.com/" + RandomGenerator.alphaNumeric(15),
          status: "active",
        },
      },
    );
  typia.assert(fileUpload);
  const member_id = fileUpload.uploaded_by_member_id;

  // 2. Member creates a community
  const slug = RandomGenerator.alphaNumeric(12);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          title: RandomGenerator.paragraph(),
          description: RandomGenerator.content(),
          slug,
        },
      },
    );
  typia.assert(community);

  // 3. Admin creates report category
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: "policy-violation-" + RandomGenerator.alphaNumeric(6),
          allow_free_text: true,
        },
      },
    );
  typia.assert(reportCategory);

  // 4. Member files report (simulate: post_id = random uuid, report_category_id as above)
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 8 }),
      },
    },
  );
  typia.assert(report);

  // 5. Moderator registers (must use member email & any password)
  const password = "P@ssw0rd1";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      password,
      community_id: community.id,
    },
  });
  typia.assert(moderator);

  // 6. Assign moderator to the community
  const assignment =
    await api.functional.communityPlatform.moderator.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member_id,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(assignment);

  // 7. Moderator creates moderation queue entry
  const queue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: community.id,
          report_id: report.id,
          assigned_moderator_id: moderator.id,
          status: RandomGenerator.pick([
            "pending",
            "in_progress",
            "resolved",
            "escalated",
          ] as const),
          priority: RandomGenerator.pick(["normal", "high", "urgent"] as const),
        },
      },
    );
  typia.assert(queue);

  // 8. Moderator GETs queue entry detail
  const fetched =
    await api.functional.communityPlatform.moderator.moderationQueues.at(
      connection,
      {
        moderationQueueId: queue.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("queue fetched by id matches original", fetched, queue);
  TestValidator.equals(
    "assigned moderator id matches",
    fetched.assigned_moderator_id,
    queue.assigned_moderator_id,
  );
  TestValidator.equals(
    "community id matches",
    fetched.community_id,
    queue.community_id,
  );
  TestValidator.equals("report id matches", fetched.report_id, queue.report_id);
  TestValidator.equals("status matches", fetched.status, queue.status);
  TestValidator.equals("priority matches", fetched.priority, queue.priority);

  // 9. Edge: Attempt to access a queue entry for another community (to which moderator is not assigned)
  // Create a second community and moderation queue entry with different ids
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          title: RandomGenerator.paragraph(),
          description: RandomGenerator.content(),
          slug: RandomGenerator.alphaNumeric(13),
        },
      },
    );
  typia.assert(otherCommunity);
  const otherReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategory.id,
      },
    });
  typia.assert(otherReport);
  const otherQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          community_id: otherCommunity.id,
          report_id: otherReport.id,
          assigned_moderator_id: typia.random<string & tags.Format<"uuid">>(),
          status: RandomGenerator.pick([
            "pending",
            "in_progress",
            "resolved",
            "escalated",
          ] as const),
          priority: RandomGenerator.pick(["normal", "high", "urgent"] as const),
        },
      },
    );
  typia.assert(otherQueue);

  // Attempt GET as assigned moderator to a moderation queue in a community they are not assigned
  await TestValidator.error(
    "moderator forbidden from accessing moderation queue outside assignment",
    async () => {
      await api.functional.communityPlatform.moderator.moderationQueues.at(
        connection,
        {
          moderationQueueId: otherQueue.id,
        },
      );
    },
  );
}
