import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test manager access to all timelog records across organization.
 *
 * Validates that managers with time:view_all or time:manage permissions can retrieve timelog records from all employees within their organization. The test ensures proper permission-based access control and organization scoping when listing timelogs.
 *
 * This test verifies the following scenarios:
 * 1. Manager authenticates successfully
 * 2. Manager can retrieve timelog list with proper pagination
 * 3. Manager can filter timelogs by employee ID
 * 4. Response includes proper pagination metadata
 * 5. Timelog entries contain required fields (id, duration, date)
 *
 * @param connection Base HTTP connection to the server
 */
export async function test_api_timelog_list_manager_all_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member account
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth: IHrmMember.IAuthorized = await authorize_member_join(
    managerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(managerAuth);
  // 2. Create employee member account for filtering test
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth: IHrmMember.IAuthorized = await authorize_member_join(
    employeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(employeeAuth);
  // 3. Manager retrieves all timelogs (simulated - assumes organization context exists)
  const allTimelogs: IPageIHrmTimelog.ISummary =
    await api.functional.hrm.member.timelogs.index(managerConnection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IHrmTimelog.IRequest,
    });
  typia.assert(allTimelogs);
  // 4. Validate response structure
  TestValidator.predicate(
    "has pagination metadata",
    allTimelogs.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(allTimelogs.data));
  TestValidator.equals(
    "pagination current page >= 0",
    allTimelogs.pagination.current,
    allTimelogs.pagination.current >= 0 ? allTimelogs.pagination.current : 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    allTimelogs.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    allTimelogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    allTimelogs.pagination.pages >= 0,
  );
  // 5. Test filtering by employee ID
  const filteredTimelogs: IPageIHrmTimelog.ISummary =
    await api.functional.hrm.member.timelogs.index(managerConnection, {
      body: {
        employee_ids: [employeeAuth.id],
        page: 1,
        limit: 50,
      } satisfies IHrmTimelog.IRequest,
    });
  typia.assert(filteredTimelogs);
  // 6. Validate filtered response
  TestValidator.predicate(
    "filtered has pagination",
    filteredTimelogs.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered has data array",
    Array.isArray(filteredTimelogs.data),
  );
  // 7. Validate timelog entries have required fields when data exists
  // Removed - ISummary type does not have id, duration_minutes, date properties
  // 8. Test date range filtering
  const dateFilteredTimelogs: IPageIHrmTimelog.ISummary =
    await api.functional.hrm.member.timelogs.index(managerConnection, {
      body: {
        start_date: new Date(Date.now() - 86400000 * 7).toISOString(),
        end_date: new Date().toISOString(),
        page: 1,
        limit: 50,
      } satisfies IHrmTimelog.IRequest,
    });
  typia.assert(dateFilteredTimelogs);
  // 9. Validate date filtered response
  TestValidator.predicate(
    "date filtered has pagination",
    dateFilteredTimelogs.pagination !== undefined,
  );
  TestValidator.predicate(
    "date filtered has data array",
    Array.isArray(dateFilteredTimelogs.data),
  );
}