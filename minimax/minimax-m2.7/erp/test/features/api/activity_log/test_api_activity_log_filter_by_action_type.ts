import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_log_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Get all activity logs first to establish baseline
  const allLogsResponse = await api.functional.erpHrm.admin.activity_logs.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(allLogsResponse);
  // 3. Test filtering by actionType - timesheet_submitted
  const actionTypeFilter: IErpHrmActivityLog.IRequest = {
    actionType: "timesheet_submitted",
  };
  const filteredByActionType =
    await api.functional.erpHrm.admin.activity_logs.index(adminConnection, {
      body: actionTypeFilter satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(filteredByActionType);
  // Validate all returned logs have the specified actionType
  for (const log of filteredByActionType.data) {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      "timesheet_submitted",
    );
  }
  // 4. Test filtering by targetEntityType - project
  const targetEntityTypeFilter: IErpHrmActivityLog.IRequest = {
    targetEntityType: "project",
  };
  const filteredByEntityType =
    await api.functional.erpHrm.admin.activity_logs.index(adminConnection, {
      body: targetEntityTypeFilter satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(filteredByEntityType);
  // Validate all returned logs have targetEntityType = "project"
  for (const log of filteredByEntityType.data) {
    TestValidator.equals(
      "targetEntityType matches filter",
      log.targetEntityType,
      "project",
    );
  }
  // 5. Test filtering by memberId
  if (allLogsResponse.data.length > 0) {
    const memberId = allLogsResponse.data[0].member.id;
    const memberFilter: IErpHrmActivityLog.IRequest = {
      memberId: memberId,
    };
    const filteredByMember =
      await api.functional.erpHrm.admin.activity_logs.index(adminConnection, {
        body: memberFilter satisfies IErpHrmActivityLog.IRequest,
      });
    typia.assert(filteredByMember);
    // Validate all returned logs are from the specified member
    for (const log of filteredByMember.data) {
      TestValidator.equals("memberId matches filter", log.member.id, memberId);
    }
  }
  // 6. Test combined filters (AND logic) - actionType + targetEntityType
  const combinedFilter: IErpHrmActivityLog.IRequest = {
    actionType: "project_created",
    targetEntityType: "project",
  };
  const combinedResults = await api.functional.erpHrm.admin.activity_logs.index(
    adminConnection,
    {
      body: combinedFilter satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(combinedResults);
  // Validate combined filters work correctly (AND logic)
  for (const log of combinedResults.data) {
    TestValidator.equals(
      "actionType matches combined filter",
      log.actionType,
      "project_created",
    );
    TestValidator.equals(
      "targetEntityType matches combined filter",
      log.targetEntityType,
      "project",
    );
  }
  // 7. Test filtering with pagination
  const paginatedFilter: IErpHrmActivityLog.IRequest = {
    actionType: "timesheet_submitted",
    page: 1,
    limit: 5,
  };
  const paginatedResults =
    await api.functional.erpHrm.admin.activity_logs.index(adminConnection, {
      body: paginatedFilter satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResults.data.length <= 5,
  );
  TestValidator.equals(
    "page number correct",
    paginatedResults.pagination.current,
    1,
  );
  // 8. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: IErpHrmActivityLog.IRequest = {
    createdAtAfter: thirtyDaysAgo.toISOString(),
    createdAtBefore: now.toISOString(),
  };
  const dateFilteredResults =
    await api.functional.erpHrm.admin.activity_logs.index(adminConnection, {
      body: dateRangeFilter satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(dateFilteredResults);
  // Validate all returned logs are within date range
  for (const log of dateFilteredResults.data) {
    const logDate = new Date(log.createdAt);
    TestValidator.predicate(
      "log date within range",
      logDate >= thirtyDaysAgo && logDate <= now,
    );
  }
}
