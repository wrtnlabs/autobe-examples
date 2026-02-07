import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_log_query_by_time_range_and_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. First, query to get any audit logs to find a valid "approve_report" entry
  const firstQuery = await api.functional.community.admin.audit_logs.patch(
    adminConnection,
    {
      body: {} satisfies ICommunityAuditLog.IRequest,
    },
  );
  typia.assert(firstQuery);
  // Find the first audit log with action_type === "approve_report"
  const approveReportLog = firstQuery.data.find(
    (log) => log.action_type === "approve_report",
  );
  let targetId: string | undefined = undefined;
  let createdAfter: string | undefined = undefined;
  let createdBefore: string | undefined = undefined;
  if (approveReportLog) {
    // Use the found log's data for filtering
    targetId = approveReportLog.target_id;
    const approveTime = new Date(approveReportLog.created_at);
    createdAfter = new Date(approveTime.getTime() - 1800000).toISOString(); // 30 minutes before
    createdBefore = new Date(approveTime.getTime() + 1800000).toISOString(); // 30 minutes after
  } else {
    // No approve_report logs found, use default time range
    createdBefore = new Date().toISOString();
    createdAfter = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
    // target_id will be left undefined
  }
  // 3. Construct the request body with filtering
  // ICommunityAuditLog.IRequest is {} so we extend with satisfies
  const filterBody: ICommunityAuditLog.IRequest = {
    target_id: targetId,
    action_type: "approve_report",
    created_at_gte: createdAfter,
    created_at_lte: createdBefore,
  } satisfies ICommunityAuditLog.IRequest;
  // 4. Query audit logs with filters
  const result = await api.functional.community.admin.audit_logs.patch(
    adminConnection,
    {
      body: filterBody,
    },
  );
  typia.assert(result);
  // 5. Validate response structure
  // Check pagination
  TestValidator.equals("pagination exists", result.pagination != null, true);
  TestValidator.equals("pagination.current >= 1", result.pagination.current, 1);
  TestValidator.equals(
    "pagination.limit > 0",
    result.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination.records >= 0",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.pages >= 0",
    result.pagination.pages >= 0,
    true,
  );
  // Check data array
  TestValidator.equals("data array exists", result.data != null, true);
  // Validate all returned audit log entries
  for (const log of result.data) {
    // Verify expected filters
    if (targetId !== undefined) {
      TestValidator.equals("target_id matches filter", log.target_id, targetId);
    }
    TestValidator.equals(
      "action_type matches filter",
      log.action_type,
      "approve_report",
    );
    if (createdAfter !== undefined) {
      TestValidator.predicate(
        "created_at >= created_after",
        log.created_at >= createdAfter,
      );
    }
    if (createdBefore !== undefined) {
      TestValidator.predicate(
        "created_at <= created_before",
        log.created_at <= createdBefore,
      );
    }
    // Verify format of all fields
    TestValidator.predicate(
      "id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.id,
      ),
    );
    TestValidator.predicate(
      "moderator_id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.moderator_id,
      ),
    );
    TestValidator.predicate(
      "target_id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.target_id,
      ),
    );
    TestValidator.predicate(
      "target_type is valid",
      ["post", "comment", "report"].includes(log.target_type),
    );
    TestValidator.predicate(
      "action_type is valid",
      ["delete_post", "ban_user", "approve_report", "dismiss_report"].includes(
        log.action_type,
      ),
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/i.test(
        log.created_at,
      ),
    );
  }
  // 6. Verify that non-admin cannot access this endpoint
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  try {
    await api.functional.community.admin.audit_logs.patch(
      unauthorizedConnection,
      {
        body: {} satisfies ICommunityAuditLog.IRequest,
      },
    );
    throw new Error("Expected unauthorized access to be rejected");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "non-admin access rejected with 401 or 403",
        [401, 403].includes(error.status),
        true,
      );
    } else {
      throw error;
    }
  }
}
