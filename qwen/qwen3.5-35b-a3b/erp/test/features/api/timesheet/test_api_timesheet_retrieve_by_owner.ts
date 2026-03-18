import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish session
  const authConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    authConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: RandomGenerator.alphaNumeric(20),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(member);
  // Create authenticated connection for timesheet API calls
  const timesheetConnection: api.IConnection = { host: connection.host };
  timesheetConnection.headers = { Authorization: member.token.access };
  // 2. Retrieve timesheet (using valid UUID format)
  const timesheetId: string = typia.random<string & tags.Format<"uuid">>();
  const timesheet: IHrmsTimesheet =
    await api.functional.hrms.member.timesheets.at(timesheetConnection, {
      timesheetId,
    });
  typia.assert(timesheet);
  // 3. Validate response structure - all required fields present
  TestValidator.equals("timesheet has id", typeof timesheet.id, "string");
  TestValidator.equals(
    "timesheet has employee",
    typeof timesheet.employee.id,
    "string",
  );
  TestValidator.equals(
    "timesheet has timelogs array",
    Array.isArray(timesheet.timelogs),
    true,
  );
  TestValidator.equals(
    "timesheet has week_start_date",
    typeof timesheet.week_start_date,
    "string",
  );
  TestValidator.equals(
    "timesheet has week_end_date",
    typeof timesheet.week_end_date,
    "string",
  );
  TestValidator.equals(
    "timesheet has status",
    typeof timesheet.status,
    "string",
  );
  TestValidator.equals(
    "timesheet has total_hours",
    typeof timesheet.total_hours,
    "number",
  );
  // 4. Validate timelogs structure if any exist
  if (timesheet.timelogs.length > 0) {
    // Timelog properties validation removed - IHrmsTimelog doesn't have id, project_id, duration_minutes
  }
  // 5. Validate employee display_name exists
  TestValidator.equals(
    "employee has display_name",
    typeof timesheet.employee.display_name,
    "string",
  );
  // 6. Validate organization context from member
  if (member.organization_memberships.length > 0) {
    const orgMembership = member.organization_memberships[0];
    TestValidator.equals(
      "org membership has organization",
      typeof orgMembership.organization.id,
      "string",
    );
    TestValidator.equals(
      "org membership has role",
      typeof orgMembership.organizationRole.id,
      "string",
    );
  }
}