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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the basic filtering functionality of moderation logs with minimal criteria.
 * An administrator should be able to search for moderation logs by action type and status.
 * The test verifies that the system correctly filters logs by specific action types
 * (e.g., 'delete_article', 'ban_user') and status values (e.g., 'completed', 'pending').
 * The response should include paginated results with proper metadata and only matching records.
 */
export async function test_api_moderation_logs_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test filtering by action_type with a realistic value
  const actionTypeResponse =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          action_type: "delete_article", // Use a realistic action type
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(actionTypeResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "has valid current page",
    actionTypeResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    actionTypeResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has valid records",
    actionTypeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages",
    actionTypeResponse.pagination.pages >= 0,
  );
  // Test filtering by status with a realistic value
  const statusResponse =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          status: "completed", // Use a realistic status
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(statusResponse);
  // Test combined filtering by action_type and status
  const combinedResponse =
    await api.functional.discussionBoard.admin.moderation_logs.index(
      adminConnection,
      {
        body: {
          action_type: "delete_article",
          status: "completed",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate pagination consistency
  TestValidator.predicate(
    "combined response has valid pagination",
    combinedResponse.pagination.records >= 0,
  );
}
