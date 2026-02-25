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

export async function test_api_moderation_action_logs_admin_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Note: Since we cannot create actual moderation actions through available APIs,
  // we'll test the filtering functionality assuming some actions exist in the system
  const actionTypes = ["ban_user", "delete_post", "delete_comment"] as const;
  // Test filtering by each action type individually
  for (const actionType of actionTypes) {
    const filteredLogs =
      await api.functional.communityPlatform.admin.moderation_action_logs.index(
        adminConnection,
        {
          body: {
            action_type: actionType,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformModerationActionLog.IRequest,
        },
      );
    typia.assert(filteredLogs);
    // Verify all returned logs match the requested action type
    TestValidator.predicate(
      `all logs should have action type ${actionType}`,
      filteredLogs.data.every((log) => log.action_type === actionType),
    );
    // Validate pagination structure
    TestValidator.predicate(
      `pagination should be valid for ${actionType}`,
      filteredLogs.pagination.current >= 0 &&
        filteredLogs.pagination.limit > 0 &&
        filteredLogs.pagination.records >= 0 &&
        filteredLogs.pagination.pages >= 0,
    );
  }
  // Test combination of action_type with date filter
  const combinedFilterLogs =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          action_type: "ban_user",
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(combinedFilterLogs);
  // Test edge case with non-existent action type
  const nonExistentLogs =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          action_type: "non_existent_action_type_123",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(nonExistentLogs);
  // Validate audit trail integrity for returned logs
  const sampleLogs =
    await api.functional.communityPlatform.admin.moderation_action_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformModerationActionLog.IRequest,
      },
    );
  typia.assert(sampleLogs);
  if (sampleLogs.data.length > 0) {
    for (const log of sampleLogs.data) {
      // Validate moderator information
      TestValidator.predicate(
        "moderator should have valid ID and email",
        log.moderator.id !== undefined && log.moderator.email !== undefined,
      );
      // Validate community information
      TestValidator.predicate(
        "community should have valid ID and name",
        log.community.id !== undefined && log.community.name !== undefined,
      );
      // Validate action description
      TestValidator.predicate(
        "action description should be present",
        log.action_description !== undefined &&
          log.action_description.length > 0,
      );
      // Validate timestamp
      TestValidator.predicate(
        "created_at should be valid ISO string",
        !isNaN(new Date(log.created_at).getTime()),
      );
    }
  }
}
