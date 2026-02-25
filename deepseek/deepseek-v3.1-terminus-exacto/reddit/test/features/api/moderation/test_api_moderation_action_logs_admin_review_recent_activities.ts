import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_logs_admin_review_recent_activities(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test basic pagination without filters
  const basicRequest: ICommunityPlatformModerationActionLog.IRequest = {
    page: 1,
    limit: 10,
  };
  const basicResponse =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      { body: basicRequest },
    );
  typia.assert(basicResponse);
  // Validate pagination business logic (not type validation)
  TestValidator.predicate(
    "current page should be 1",
    basicResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should match request",
    basicResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    basicResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    basicResponse.pagination.pages >= 0,
  );
  // Test with date range filter
  const dateRangeRequest: ICommunityPlatformModerationActionLog.IRequest = {
    page: 1,
    limit: 5,
    created_at_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_end: new Date().toISOString(),
  };
  const dateRangeResponse =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResponse);
  // Test with action type filter
  const actionTypeRequest: ICommunityPlatformModerationActionLog.IRequest = {
    page: 1,
    limit: 5,
    action_type: "delete_post",
  };
  const actionTypeResponse =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      { body: actionTypeRequest },
    );
  typia.assert(actionTypeResponse);
  // Test combined filters
  const combinedRequest: ICommunityPlatformModerationActionLog.IRequest = {
    page: 1,
    limit: 3,
    action_type: "ban_user",
    created_at_start: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    updated_at_end: new Date().toISOString(),
  };
  const combinedResponse =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      { body: combinedRequest },
    );
  typia.assert(combinedResponse);
  // Validate business logic - if we have data, check that pagination metadata is consistent
  if (basicResponse.data.length > 0) {
    TestValidator.predicate(
      "data length should not exceed limit",
      basicResponse.data.length <= basicResponse.pagination.limit,
    );
    // Validate that each entry has consistent moderator-community relationships
    for (const logEntry of basicResponse.data) {
      TestValidator.predicate(
        "moderator should have valid email format",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(logEntry.moderator.email),
      );
      TestValidator.predicate(
        "community should have non-empty name",
        logEntry.community.name.length > 0,
      );
    }
  }
}
