import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a regular employee cannot list timesheets filtered by another employee's ID.
 *
 * Validates the permission boundary for the timesheet listing endpoint's `employeeId` filter. The `employeeId` parameter is documented as available only to users with `time:view_all` or time approval permission. Regular employees who attempt to filter by a different employee's ID should receive a 403 Forbidden response, preventing unauthorized cross-employee data access.
 *
 * The test also verifies that the regular employee can successfully list timesheets without the `employeeId` filter, confirming that the endpoint itself is accessible — only the cross-employee filtering is restricted.
 *
 * 1. A regular member is created via the join endpoint with no special permissions.
 * 2. The member lists timesheets without the `employeeId` filter to confirm basic access.
 * 3. The member attempts to list timesheets with `employeeId` set to a different UUID.
 * 4. The request is rejected with a 403 Forbidden error.
 */
export async function test_api_timesheet_list_permission_denied_cross_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a regular member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. List timesheets without employeeId filter - should succeed
  const ownTimesheets = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(ownTimesheets);
  // 3. Attempt to list timesheets filtered by a different employee's ID
  await TestValidator.httpError(
    "regular employee cannot filter by another employee's ID",
    403,
    async () => {
      await api.functional.erpHrm.member.timesheets.index(memberConnection, {
        body: {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimesheet.IRequest,
      });
    },
  );
}
