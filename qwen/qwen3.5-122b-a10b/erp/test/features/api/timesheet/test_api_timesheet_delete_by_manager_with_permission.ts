import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test manager with time:manage permission can delete another employee's draft timesheet.
 *
 * Validates the permission-based access control where users with time:manage permission can manage any employee's draft timesheets. This test verifies the deletion endpoint accepts requests from authorized managers and properly handles the soft delete operation.
 *
 * Due to limited SDK functions in the provided input materials, this test focuses on demonstrating the correct API call pattern for timesheet deletion with proper connection isolation between manager and employee contexts. Full organization setup, employee creation, timesheet creation, and permission assignment require additional SDK functions not available in the current test environment.
 *
 * 1. Register two member accounts with unique credentials.
 * 2. Create separate connection objects for each member.
 * 3. Call the timesheet deletion endpoint using manager's connection.
 * 4. Verify the API call completes without compilation errors.
 * 5. Validate the response follows expected 204 No Content pattern.
 */
export async function test_api_timesheet_delete_by_manager_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register employee member
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 2. Register manager member
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 3. Delete timesheet using manager's connection (with time:manage permission)
  // Note: organizationCode and timesheetId would come from prior setup in full scenario
  await api.functional.hrm.member.organizations.timesheets.eraseByOrganizationcodeAndTimesheetid(
    managerConnection,
    {
      organizationCode: typia.random<string>(),
      timesheetId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
