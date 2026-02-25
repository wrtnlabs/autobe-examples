import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_moderation_logs_admin_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple administrators
  const adminConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
    adminConnections.push(adminConnection);
  }
  // Generate moderation actions across different time periods
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  // Action types to test
  const actionTypes = [
    "article_delete",
    "comment_delete",
    "content_hide",
  ] as const;
  // Generate diverse moderation reasons
  const reasons = [
    "Spam content detected",
    "Inappropriate language used",
    "Violates community guidelines",
    "Copyright infringement",
    "Harassment reported",
    "Off-topic discussion",
  ];
  // Test 1: Filter by specific action type only
  const articleDeleteResult =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnections[0],
      {
        body: {
          action_type: "article_delete",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(articleDeleteResult);
  // Test 2: Filter by date range
  const dateRangeResult =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnections[0],
      {
        body: {
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Test 3: Search for moderation reasons containing specific keywords
  const keywordResult =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnections[0],
      {
        body: {
          reason: "guidelines",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(keywordResult);
  // Test 4: Filter by specific administrator
  const adminResult =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnections[0],
      {
        body: {
          admin_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(adminResult);
  // Test 5: Combined filtering - action type + date range
  const combinedResult =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnections[0],
      {
        body: {
          action_type: "comment_delete",
          created_at_start: twoDaysAgo.toISOString(),
          created_at_end: oneDayAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Test 6: Edge case - overlapping date ranges
  const overlappingResult =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnections[0],
      {
        body: {
          created_at_start: twoDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(overlappingResult);
  // Test 7: Partial keyword matches
  const partialResult =
    await api.functional.discussionBoard.admin.content_moderation_logs.index(
      adminConnections[0],
      {
        body: {
          reason: "content",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(partialResult);
  // Validate pagination properties
  const pagination = articleDeleteResult.pagination as any;
  TestValidator.predicate(
    "pagination has current page",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    pagination.pages >= 0,
  );
  // Validate result structure
  if (articleDeleteResult.data.length > 0) {
    const logEntry = articleDeleteResult.data[0];
    TestValidator.predicate(
      "log entry has id",
      typeof logEntry.id === "string",
    );
    TestValidator.predicate(
      "log entry has action type",
      typeof logEntry.action_type === "string",
    );
    TestValidator.predicate(
      "log entry has target content type",
      typeof logEntry.target_content_type === "string",
    );
    TestValidator.predicate(
      "log entry has target content id",
      typeof logEntry.target_content_id === "string",
    );
    TestValidator.predicate(
      "log entry has created at",
      typeof logEntry.created_at === "string",
    );
    TestValidator.predicate(
      "log entry has admin info",
      typeof logEntry.admin === "object",
    );
  }
}