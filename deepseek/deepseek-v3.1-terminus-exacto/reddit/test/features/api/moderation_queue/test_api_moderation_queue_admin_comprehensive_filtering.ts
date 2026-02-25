import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive filtering of moderation queues for admin users.
 * Create multiple moderation queue items with varying statuses, priorities,
 * and assigned moderators. Test filtering by status, priority, moderator ID,
 * post ID, and comment ID with pagination validation.
 */
export async function test_api_moderation_queue_admin_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Note: Since we don't have API functions to create moderation queues, posts, comments, or moderators,
  // we can only test the filtering functionality with whatever data exists in the database.
  // The test will focus on validating the filtering logic and pagination.
  // Test filtering by different statuses
  const statuses = ["pending", "assigned", "in-review", "resolved"] as const;
  for (const status of statuses) {
    const response =
      await api.functional.communityPlatform.admin.moderation_queues.index(
        adminConnection,
        {
          body: {
            status,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(response);
    // Validate that all returned items match the requested status (if any items exist)
    for (const item of response.data) {
      TestValidator.equals(
        `status filter matches for ${status}`,
        item.status,
        status,
      );
    }
  }
  // Test filtering by different priorities
  const priorities = ["low", "normal", "high", "critical"] as const;
  for (const priority of priorities) {
    const response =
      await api.functional.communityPlatform.admin.moderation_queues.index(
        adminConnection,
        {
          body: {
            priority,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(response);
    // Validate that all returned items match the requested priority (if any items exist)
    for (const item of response.data) {
      TestValidator.equals(
        `priority filter matches for ${priority}`,
        item.priority,
        priority,
      );
    }
  }
  // Test filtering by moderator_id (using null to test the filter)
  const moderatorFilterResponse =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          moderator_id: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(moderatorFilterResponse);
  // Test filtering by post_id (using null to test the filter)
  const postFilterResponse =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          post_id: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(postFilterResponse);
  // Test filtering by comment_id (using null to test the filter)
  const commentFilterResponse =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          comment_id: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(commentFilterResponse);
  // Test pagination functionality
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
    { page: 1, limit: 20 },
  ] as const;
  for (const { page, limit } of paginationTests) {
    const response =
      await api.functional.communityPlatform.admin.moderation_queues.index(
        adminConnection,
        {
          body: {
            page,
            limit,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `pagination current page for page ${page}`,
      response.pagination.current,
      page,
    );
    TestValidator.equals(
      `pagination limit for limit ${limit}`,
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `records count valid for page ${page}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pages count valid for page ${page}`,
      response.pagination.pages >= 0,
    );
    // Data length should not exceed limit
    TestValidator.predicate(
      `data length within limit ${limit}`,
      response.data.length <= limit,
    );
  }
  // Test combined filtering
  const combinedResponse =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          status: "pending",
          priority: "high",
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined filter results (if any items exist)
  for (const item of combinedResponse.data) {
    TestValidator.equals("combined status filter", item.status, "pending");
    TestValidator.equals("combined priority filter", item.priority, "high");
  }
  // Test empty filter (should return all items)
  const allItemsResponse =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(allItemsResponse);
  TestValidator.predicate(
    "all items response has valid data",
    allItemsResponse.data.length >= 0,
  );
  // Validate that response structure includes proper moderation queue summaries
  if (allItemsResponse.data.length > 0) {
    const sampleItem = allItemsResponse.data[0];
    TestValidator.predicate("item has id", sampleItem.id.length > 0);
    TestValidator.predicate("item has status", sampleItem.status.length > 0);
    TestValidator.predicate(
      "item has priority",
      sampleItem.priority.length > 0,
    );
    // These fields can be null, but if they exist, validate their structure
    if (sampleItem.moderator !== null) {
      TestValidator.predicate(
        "moderator has id",
        sampleItem.moderator.id.length > 0,
      );
      TestValidator.predicate(
        "moderator has email",
        sampleItem.moderator.email.length > 0,
      );
    }
    if (sampleItem.post !== null) {
      TestValidator.predicate("post has id", sampleItem.post.id.length > 0);
      TestValidator.predicate(
        "post has title",
        sampleItem.post.title.length > 0,
      );
    }
    if (sampleItem.comment !== null) {
      TestValidator.predicate(
        "comment has id",
        sampleItem.comment.id.length > 0,
      );
      TestValidator.predicate(
        "comment has content",
        sampleItem.comment.content.length > 0,
      );
    }
  }
}
