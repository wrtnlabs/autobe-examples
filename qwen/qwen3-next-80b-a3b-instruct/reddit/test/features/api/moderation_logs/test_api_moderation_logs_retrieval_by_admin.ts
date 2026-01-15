import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_logs_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    },
  });
  typia.assert(adminAuth);
  // Step 2: Generate multiple moderation logs with different criteria
  // Create random data for testing
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const targetId1 = typia.random<string & tags.Format<"uuid">>();
  const targetId2 = typia.random<string & tags.Format<"uuid">>();
  const targetId3 = typia.random<string & tags.Format<"uuid">>();
  // Generate a variety of moderation actions
  const moderationActions = [
    {
      moderator_id: moderatorId,
      action: "approve" as const,
      target_type: "post" as const,
      target_id: targetId1,
      created_at: new Date().toISOString(),
    },
    {
      moderator_id: moderatorId,
      action: "reject" as const, // Added reject action for filtering test
      target_type: "comment" as const,
      target_id: targetId2,
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    },
    {
      moderator_id: moderatorId,
      action: "ban" as const,
      target_type: "user" as const,
      target_id: targetId1,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      moderator_id: typia.random<string & tags.Format<"uuid">>(),
      action: "remove" as const,
      target_type: "product" as const,
      target_id: typia.random<string & tags.Format<"uuid">>(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    },
    {
      moderator_id: moderatorId,
      action: "warn" as const,
      target_type: "review" as const,
      target_id: targetId3,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    },
  ];
  // Validate that the moderatorId has at least one action
  if (moderationActions.length === 0) {
    throw new Error("No moderation actions created for testing");
  }
  // Step 3: Test retrieval with no filters (default behavior - most recent first)
  const defaultResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default result has pagination",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default result has limit",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.predicate("results are ordered by timestamp descending", () => {
    if (defaultResult.data.length < 2) return true;
    for (let i = 0; i < defaultResult.data.length - 1; i++) {
      if (
        new Date(defaultResult.data[i].created_at) <
        new Date(defaultResult.data[i + 1].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // Step 4: Test filtering by moderator_id
  const moderatorFilterResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          moderator_id: moderatorId,
        },
      },
    );
  typia.assert(moderatorFilterResult);
  TestValidator.predicate("all results match moderator_id", () => {
    return moderatorFilterResult.data.every(
      (log) => log.moderator_id === moderatorId,
    );
  });
  // Step 5: Test filtering by action_type
  const actionFilterResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          action_type: "reject",
        },
      },
    );
  typia.assert(actionFilterResult);
  TestValidator.predicate("all results match action_type", () => {
    return actionFilterResult.data.every((log) => log.action === "reject");
  });
  // Step 6: Test filtering by target_type
  const targetTypeFilterResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          target_type: "post",
        },
      },
    );
  typia.assert(targetTypeFilterResult);
  TestValidator.predicate("all results match target_type", () => {
    return targetTypeFilterResult.data.every(
      (log) => log.target_type === "post",
    );
  });
  // Step 7: Test filtering by target_id
  const targetIdFilterResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          target_id: targetId1,
        },
      },
    );
  typia.assert(targetIdFilterResult);
  TestValidator.predicate("all results match target_id", () => {
    return targetIdFilterResult.data.every(
      (log) => log.target_id === targetId1,
    );
  });
  // Step 8: Test date range filtering (start_date) - now using time from 3 hours ago to include relevant logs
  const startDateFilterResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          start_date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        },
      },
    );
  typia.assert(startDateFilterResult);
  TestValidator.predicate("all results are after start_date", () => {
    const startDate = new Date(Date.now() - 1000 * 60 * 60 * 3);
    return startDateFilterResult.data.every(
      (log) => new Date(log.created_at) >= startDate,
    );
  });
  // Step 9: Test date range filtering (end_date) - now using time from 1 hour ago to include relevant logs
  const endDateFilterResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          end_date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        },
      },
    );
  typia.assert(endDateFilterResult);
  TestValidator.predicate("all results are before end_date", () => {
    const endDate = new Date(Date.now() - 1000 * 60 * 60);
    return endDateFilterResult.data.every(
      (log) => new Date(log.created_at) <= endDate,
    );
  });
  // Step 10: Test pagination with page and limit
  const paginationResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 3,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 3",
    paginationResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination data has 3 items",
    paginationResult.data.length,
    3,
  );
  // Step 11: Test with different sort_by and sort_order
  const sortByTimestampResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          sort_by: "timestamp",
          sort_order: "asc",
        },
      },
    );
  typia.assert(sortByTimestampResult);
  TestValidator.predicate("results are ordered by timestamp ascending", () => {
    if (sortByTimestampResult.data.length < 2) return true;
    for (let i = 0; i < sortByTimestampResult.data.length - 1; i++) {
      if (
        new Date(sortByTimestampResult.data[i].created_at) >
        new Date(sortByTimestampResult.data[i + 1].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // Step 12: Test combination of filters
  const combinedFilterResult =
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          moderator_id: moderatorId,
          action_type: "approve",
          target_type: "post",
          target_id: targetId1,
          start_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate("all results match combined filters", () => {
    return combinedFilterResult.data.every(
      (log) =>
        log.moderator_id === moderatorId &&
        log.action === "approve" &&
        log.target_type === "post" &&
        log.target_id === targetId1 &&
        new Date(log.created_at) >= new Date(Date.now() - 1000 * 60 * 60 * 24),
    );
  });
  // Step 13: Validate overall response structure
  TestValidator.equals(
    "response structure is IPageICommunityPlatformModerationLog.ISummary",
    "data" in defaultResult,
    true,
  );
  TestValidator.equals(
    "response structure is IPageICommunityPlatformModerationLog.ISummary",
    "pagination" in defaultResult,
    true,
  );
  TestValidator.predicate(
    "data items are ICommunityPlatformModerationLog.ISummary",
    () => {
      return defaultResult.data.every(
        (log) =>
          typeof log.id === "string" &&
          typeof log.moderator_id === "string" &&
          [
            "approve",
            "reject",
            "ban",
            "remove",
            "lock",
            "unlock",
            "warn",
            "mute",
            "unmute",
            "other",
          ].includes(log.action) &&
          [
            "post",
            "comment",
            "user",
            "community",
            "product",
            "review",
            "question",
            "answer",
            "other",
          ].includes(log.target_type) &&
          typeof log.target_id === "string" &&
          (log.reason === undefined ||
            (typeof log.reason === "string" && log.reason.length <= 500)) &&
          typeof log.created_at === "string" &&
          (log.ip_address === undefined ||
            typeof log.ip_address === "string") &&
          (log.user_agent === undefined ||
            (typeof log.user_agent === "string" &&
              log.user_agent.length <= 255)) &&
          (log.comments === undefined ||
            (typeof log.comments === "string" &&
              log.comments.length <= 1000)) &&
          ["active", "reviewed", "processed", "archived"].includes(
            log.status,
          ) &&
          (log.related_reports === undefined ||
            (Array.isArray(log.related_reports) &&
              log.related_reports.length <= 10 &&
              log.related_reports.every(
                (r) =>
                  typeof r === "string" &&
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
                    r,
                  ),
              ))),
      );
    },
  );
  // Step 14: Test invalid page values (page < 1)
  await TestValidator.error("invalid page value should fail", async () => {
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          page: 0,
        },
      },
    );
  });
  // Step 15: Test invalid limit values (limit > 100)
  await TestValidator.error("invalid limit value should fail", async () => {
    await api.functional.communityPlatform.admin.moderation.logs.index(
      adminConnection,
      {
        body: {
          limit: 101,
        },
      },
    );
  });
}
