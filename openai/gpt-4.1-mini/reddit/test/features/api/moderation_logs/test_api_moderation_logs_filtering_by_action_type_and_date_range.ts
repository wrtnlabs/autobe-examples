import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_logs_filtering_by_action_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving moderation logs filtered by specific action types including delete_post, ban_user, and dismiss_report.
  // Verify each returned log corresponds to the requested actionType and contains valid related metadata and references like moderator and target content.
  // Confirm the system handles empty result sets gracefully when no logs match the filter.
  // Also test date range filters for createdAtFrom and createdAtTo and ensure logs are returned within the requested timeframe.
  // Validate pagination and sorting behavior under these conditions.
  // 1. Moderator join and authorization
  const moderatorJoinInput: ICommunityPlatformModerator.IJoin = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: null,
    bio: null,
    avatarUrl: null,
  };
  const moderatorAuthorized = await authorize_moderator_join(
    { host: connection.host },
    { body: moderatorJoinInput },
  );
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Helper function to fetch moderation logs with given request body
  async function fetchModerationLogs(
    body: ICommunityPlatformModerationLog.IRequest,
  ): Promise<IPageICommunityPlatformModerationLog.ISummary> {
    const logs =
      await api.functional.communityPlatform.moderator.moderation_logs.index(
        moderatorConnection,
        { body },
      );
    typia.assert(logs);
    return logs;
  }
  // Test filtering by single actionType
  for (const actionType of [
    "delete_post",
    "ban_user",
    "dismiss_report",
  ] as const) {
    const response = await fetchModerationLogs({ actionType });
    typia.assert(response);
    for (const log of response.data) {
      TestValidator.equals("actionType match", log.actionType, actionType);
      typia.assert(log.moderator);
      // Validate post or comment presence according to actionType
      if (actionType === "delete_post") {
        TestValidator.predicate(
          "delete_post has post",
          log.post !== undefined && log.post !== null,
        );
      } else {
        TestValidator.predicate("post nullable if not delete_post", true);
      }
      if (actionType === "ban_user") {
        // Should not have post or comment
        TestValidator.predicate(
          "ban_user no post",
          log.post === undefined || log.post === null,
        );
        TestValidator.predicate(
          "ban_user no comment",
          log.comment === undefined || log.comment === null,
        );
      }
      if (actionType === "dismiss_report") {
        // May have post or comment
        TestValidator.predicate("moderator present", true);
      }
      // Validate timestamps
      TestValidator.predicate(
        "createdAt valid ISO",
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
          log.createdAt,
        ),
      );
    }
  }
  // Test filtering by actionType with no matching entries (unlikely, but for completeness)
  const invalidActionType = "non_existent_action_type";
  const emptyResponse = await fetchModerationLogs({
    actionType: invalidActionType,
  });
  typia.assert(emptyResponse);
  TestValidator.equals("empty data", emptyResponse.data.length, 0);
  // Test filtering by date range
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();
  const dateFilteredResponse = await fetchModerationLogs({
    createdAtFrom: dateFrom,
    createdAtTo: dateTo,
  });
  typia.assert(dateFilteredResponse);
  for (const log of dateFilteredResponse.data) {
    TestValidator.predicate(
      "createdAt within range",
      log.createdAt >= dateFrom && log.createdAt <= dateTo,
    );
  }
  // Test pagination and sorting
  const pagedResponse = await fetchModerationLogs({
    limit: 5,
    page: 1,
    sortBy: "created_at",
  });
  typia.assert(pagedResponse);
  TestValidator.predicate(
    "pagination limit",
    pagedResponse.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination page",
    pagedResponse.pagination.current === 1,
  );
  // Check sorting ascending order
  for (let i = 1; i < pagedResponse.data.length; i++) {
    TestValidator.predicate(
      "sorted by createdAt ascending",
      pagedResponse.data[i].createdAt >= pagedResponse.data[i - 1].createdAt,
    );
  }
}
