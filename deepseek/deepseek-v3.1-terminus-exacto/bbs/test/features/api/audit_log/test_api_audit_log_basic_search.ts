import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_log_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Perform basic audit log search with minimal pagination parameters
  const searchResponse =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    searchResponse.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    searchResponse.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination total records",
    searchResponse.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages",
    searchResponse.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Validate audit log entries structure
  for (const logEntry of searchResponse.data) {
    TestValidator.predicate("log entry has valid id", logEntry.id.length > 0);
    TestValidator.predicate(
      "log entry has action type",
      logEntry.action_type.length > 0,
    );
    TestValidator.predicate(
      "log entry has description",
      logEntry.description.length > 0,
    );
    TestValidator.predicate(
      "log entry has success status",
      typeof logEntry.success === "boolean",
    );
    TestValidator.predicate(
      "log entry has created_at timestamp",
      logEntry.created_at.length > 0,
    );
    TestValidator.predicate(
      "log entry has actor_type",
      logEntry.actor_type.length > 0,
    );
  }
}
