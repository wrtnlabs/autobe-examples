import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_logs_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test filtering by action_type
  const actionTypeFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "delete_article",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(actionTypeFilterResponse);
  // Test filtering by administrator identity (using the actual super admin ID)
  const adminFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          super_admin_id: superAdmin.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(adminFilterResponse);
  // Test filtering by date ranges
  const dateFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          performed_at_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          performed_at_to: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Test combining multiple filters
  const combinedFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          action_type: "ban_user",
          status: "completed",
          performed_at_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate pagination structure using TestValidator
  await TestValidator.equals(
    "pagination has current page",
    combinedFilterResponse.pagination.current,
    1,
  );
  await TestValidator.equals(
    "pagination has correct limit",
    combinedFilterResponse.pagination.limit,
    5,
  );
  await TestValidator.predicate(
    "pagination has valid records count",
    () => combinedFilterResponse.pagination.records >= 0,
  );
  await TestValidator.predicate(
    "pagination has valid pages count",
    () => combinedFilterResponse.pagination.pages >= 0,
  );
  // Validate moderation log entry structure if data exists
  if (combinedFilterResponse.data.length > 0) {
    const logEntry = combinedFilterResponse.data[0];
    await TestValidator.predicate(
      "log entry has valid structure",
      () => !!(logEntry.id &&
        logEntry.action_type &&
        logEntry.action_description &&
        logEntry.performed_at &&
        logEntry.status),
    );
  }
}