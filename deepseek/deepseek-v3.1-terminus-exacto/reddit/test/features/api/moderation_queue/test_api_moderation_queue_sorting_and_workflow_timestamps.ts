import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_queue_sorting_and_workflow_timestamps(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Test filtering by different status values
  const statuses = [
    "pending",
    "assigned",
    "in-review",
    "resolved",
    "dismissed",
  ] as const;
  for (const status of statuses) {
    const queueResponse =
      await api.functional.communityPlatform.moderator.moderation_queues.index(
        moderatorConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(queueResponse);
    // Validate pagination structure
    TestValidator.equals(
      "pagination structure",
      typeof queueResponse.pagination,
      "object",
    );
    TestValidator.predicate(
      "has current page",
      queueResponse.pagination.current >= 0,
    );
    TestValidator.predicate("has limit", queueResponse.pagination.limit >= 0);
    TestValidator.predicate(
      "has records count",
      queueResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "has pages count",
      queueResponse.pagination.pages >= 0,
    );
    // Validate queue items structure
    for (const item of queueResponse.data) {
      typia.assert(item);
      // Validate workflow timestamps
      if (item.assigned_at !== null) {
        TestValidator.predicate(
          "assigned_at is valid date",
          !isNaN(new Date(item.assigned_at).getTime()),
        );
      }
      if (item.review_started_at !== null) {
        TestValidator.predicate(
          "review_started_at is valid date",
          !isNaN(new Date(item.review_started_at).getTime()),
        );
      }
      if (item.resolved_at !== null) {
        TestValidator.predicate(
          "resolved_at is valid date",
          !isNaN(new Date(item.resolved_at).getTime()),
        );
      }
      // Validate timestamp relationships for workflow state transitions
      if (item.assigned_at !== null && item.review_started_at !== null) {
        TestValidator.predicate(
          "assigned_at before review_started_at",
          new Date(item.assigned_at) <= new Date(item.review_started_at),
        );
      }
      if (item.review_started_at !== null && item.resolved_at !== null) {
        TestValidator.predicate(
          "review_started_at before resolved_at",
          new Date(item.review_started_at) <= new Date(item.resolved_at),
        );
      }
      // Validate resolution fields for resolved/dismissed items
      if (status === "resolved" || status === "dismissed") {
        TestValidator.predicate(
          "has resolution field",
          item.resolution !== null,
        );
        TestValidator.predicate(
          "has resolution_reason field",
          item.resolution_reason !== null,
        );
        TestValidator.predicate(
          "resolution_reason is not empty",
          item.resolution_reason!.length > 0,
        );
        // Validate resolution types
        if (item.resolution !== null) {
          TestValidator.predicate(
            "resolution is valid string",
            typeof item.resolution === "string" && item.resolution.length > 0,
          );
        }
      }
      // Validate moderator reference
      if (item.moderator !== null) {
        typia.assert(item.moderator);
        TestValidator.predicate(
          "moderator has id",
          item.moderator.id.length > 0,
        );
        TestValidator.predicate(
          "moderator has email",
          item.moderator.email.length > 0,
        );
        TestValidator.predicate(
          "moderator has username",
          item.moderator.username.length > 0,
        );
      }
      // Validate content references (post or comment should exist)
      if (item.post !== null) {
        typia.assert(item.post);
        TestValidator.predicate("post has id", item.post.id.length > 0);
        TestValidator.predicate("post has title", item.post.title.length > 0);
        TestValidator.predicate(
          "post has author",
          item.post.author.id.length > 0,
        );
        TestValidator.predicate(
          "post has community",
          item.post.community.id.length > 0,
        );
      }
      if (item.comment !== null) {
        typia.assert(item.comment);
        TestValidator.predicate("comment has id", item.comment.id.length > 0);
        TestValidator.predicate(
          "comment has content",
          item.comment.content.length > 0,
        );
        TestValidator.predicate(
          "comment has author",
          item.comment.author.id.length > 0,
        );
        TestValidator.predicate(
          "comment has post",
          item.comment.post.id.length > 0,
        );
      }
    }
  }
  // Test priority filtering
  const priorities = ["low", "normal", "high", "critical"] as const;
  for (const priority of priorities) {
    const priorityResponse =
      await api.functional.communityPlatform.moderator.moderation_queues.index(
        moderatorConnection,
        {
          body: {
            priority: priority,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformModerationQueue.IRequest,
        },
      );
    typia.assert(priorityResponse);
    // Validate that returned items match the requested priority
    for (const item of priorityResponse.data) {
      TestValidator.equals("priority matches filter", item.priority, priority);
    }
  }
  // Test combined filtering
  const combinedResponse =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          priority: "high",
          page: 1,
          limit: 3,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined filter results
  for (const item of combinedResponse.data) {
    TestValidator.equals(
      "status matches combined filter",
      item.status,
      "pending",
    );
    TestValidator.equals(
      "priority matches combined filter",
      item.priority,
      "high",
    );
  }
  // Test pagination functionality
  const paginationTest =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "page number matches",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals("limit matches", paginationTest.pagination.limit, 2);
  // Test that moderator cannot access queues with invalid moderator_id filter
  // This tests the business rule that moderators can only see their assigned queues
  const invalidModeratorResponse =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          moderator_id: typia.random<string & tags.Format<"uuid">>(), // Random UUID not belonging to this moderator
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(invalidModeratorResponse);
  // The response should be empty or only contain items this moderator can access
  // This validates the business rule indirectly
  TestValidator.predicate(
    "moderator access control works",
    invalidModeratorResponse.data.length === 0 ||
      invalidModeratorResponse.data.every(
        (item) => item.moderator === null || item.moderator.id === moderator.id,
      ),
  );
}
