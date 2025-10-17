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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

/**
 * Test that an admin user can retrieve a paginated and filterable list of
 * moderation queues, reflecting all open, pending, or escalated content reports
 * across the platform, with validations on filtering, pagination, and access
 * permissions.
 */
export async function test_api_moderation_queue_list_admin_basic_access_control_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    },
  });
  typia.assert(admin);

  // 2. Register a member (simulate by uploading a file, as required for moderator assignment dependencies)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: memberId,
          original_filename: RandomGenerator.paragraph({ sentences: 2 }),
          storage_key: RandomGenerator.alphaNumeric(12),
          mime_type: "image/png",
          file_size_bytes: 1000,
          url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(24),
          status: "active",
        },
      },
    );
  typia.assert(fileUpload);

  // 3. As the member, create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(community);

  // 4. Assign moderator to community (as admin)
  const assignment =
    await api.functional.communityPlatform.admin.communities.moderatorAssignments.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: memberId,
          role: "moderator",
          start_at: new Date().toISOString(),
          note: "Initial assignment by admin",
        },
      },
    );
  typia.assert(assignment);

  // 5. As admin, retrieve moderation queue list (basic)
  const page1 =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page1);
  TestValidator.predicate("pagination info present", !!page1.pagination);
  TestValidator.predicate("data array present", Array.isArray(page1.data));

  if (page1.data.length) {
    const queue = page1.data[0];
    TestValidator.predicate(
      "moderation queue id exists",
      typeof queue.id === "string",
    );
    TestValidator.predicate(
      "community_id matches or exists",
      typeof queue.community_id === "string",
    );
    TestValidator.predicate(
      "status is present",
      typeof queue.status === "string",
    );
    TestValidator.predicate(
      "priority is present",
      typeof queue.priority === "string",
    );
    TestValidator.predicate(
      "report_id is present",
      typeof queue.report_id === "string",
    );
  }

  // 6. Filtering by community
  const filteredByCommunity =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          community_id: community.id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(filteredByCommunity);
  TestValidator.equals(
    "community_id filter returns only relevant queues",
    filteredByCommunity.data.every((q) => q.community_id === community.id),
    true,
  );

  // 7. Filtering by assigned_moderator_id (should handle empty gracefully, since assignment may or may not trigger queues for new moderator)
  const filteredByModerator =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          assigned_moderator_id: assignment.member_id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(filteredByModerator);

  if (filteredByModerator.data.length > 0)
    TestValidator.equals(
      "assigned_moderator_id filter returns correct queues",
      filteredByModerator.data.every(
        (q) => q.assigned_moderator_id === assignment.member_id,
      ),
      true,
    );

  // 8. Filtering by status and priority (pending, high)
  const filteredByStatusPriority =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          status: "pending",
          priority: "high",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(filteredByStatusPriority);
  if (filteredByStatusPriority.data.length > 0) {
    TestValidator.equals(
      "status filter returns status pending",
      filteredByStatusPriority.data.every((q) => q.status === "pending"),
      true,
    );
    TestValidator.equals(
      "priority filter returns high priority",
      filteredByStatusPriority.data.every((q) => q.priority === "high"),
      true,
    );
  }

  // 9. Sorting
  const pageDesc =
    await api.functional.communityPlatform.admin.moderationQueues.index(
      connection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(pageDesc);
  if (pageDesc.data.length > 1) {
    TestValidator.predicate(
      "queues are sorted desc by created_at",
      (() => {
        let valid = true;
        for (let i = 1; i < pageDesc.data.length; i++) {
          if (pageDesc.data[i - 1].created_at < pageDesc.data[i].created_at)
            valid = false;
        }
        return valid;
      })(),
    );
  }

  // 10. Error: try to access as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.communityPlatform.admin.moderationQueues.index(
      unauthConn,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  });
}
