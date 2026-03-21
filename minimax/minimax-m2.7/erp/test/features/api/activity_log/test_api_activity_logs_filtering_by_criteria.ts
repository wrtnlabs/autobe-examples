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

export async function test_api_activity_logs_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // Get organization ID for testing activity logs
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test filtering by action_type
  const actionTypes = [
    "employee_invited",
    "project_created",
    "timesheet_submitted",
  ] as const;
  for (const actionType of actionTypes) {
    const result =
      await api.functional.erpHrm.admin.organizations.activity_logs.index(
        adminConnection,
        {
          organizationId,
          body: {
            actionType,
            limit: 20,
            page: 1,
          } satisfies IErpHrmActivityLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      "has pagination",
      result.pagination !== undefined,
      true,
    );
  }
  // 3. Test filtering by member_id
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const memberFilterResult =
    await api.functional.erpHrm.admin.organizations.activity_logs.index(
      adminConnection,
      {
        organizationId,
        body: {
          memberId,
          limit: 20,
          page: 1,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(memberFilterResult);
  TestValidator.equals(
    "has pagination",
    memberFilterResult.pagination !== undefined,
    true,
  );
  // Validate that all returned logs have the specified member_id
  for (const log of memberFilterResult.data) {
    TestValidator.equals("member matches filter", log.member.id, memberId);
  }
  // 4. Test date range filtering
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeResult =
    await api.functional.erpHrm.admin.organizations.activity_logs.index(
      adminConnection,
      {
        organizationId,
        body: {
          startDate: startDate as string & tags.Format<"date-time">,
          endDate: endDate as string & tags.Format<"date-time">,
          limit: 20,
          page: 1,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "has pagination",
    dateRangeResult.pagination !== undefined,
    true,
  );
  // 5. Test combined filters (action_type + member_id + date range)
  const combinedResult =
    await api.functional.erpHrm.admin.organizations.activity_logs.index(
      adminConnection,
      {
        organizationId,
        body: {
          actionType: "employee_invited",
          memberId,
          startDate: startDate as string & tags.Format<"date-time">,
          endDate: endDate as string & tags.Format<"date-time">,
          limit: 20,
          page: 1,
          orderBy: "created_at",
          sortOrder: "desc",
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "has pagination",
    combinedResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current page",
    combinedResult.pagination.current,
    1,
  );
  // 6. Test pagination parameters
  const paginationResult =
    await api.functional.erpHrm.admin.organizations.activity_logs.index(
      adminConnection,
      {
        organizationId,
        body: {
          limit: 10,
          page: 2,
          orderBy: "action_type",
          sortOrder: "asc",
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "limit matches request",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page matches request",
    paginationResult.pagination.current,
    2,
  );
}
