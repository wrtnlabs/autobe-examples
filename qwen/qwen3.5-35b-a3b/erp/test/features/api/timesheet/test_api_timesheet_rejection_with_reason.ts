import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Auth as manager with time:approve permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Find an existing timesheet to test rejection workflow
  // Note: Since timesheet creation API is unavailable, we assume one exists
  // For a complete test, the environment should have pre-existing timesheets
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Submit timesheet for approval
  const submittedTimesheet = await api.functional.hrms.member.timesheets.submit(
    managerConnection,
    {
      timesheetId,
    },
  );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet submitted successfully",
    submittedTimesheet.status,
    "submitted",
  );
  // 4. Reject timesheet with reason
  const rejectionReason =
    "Timelog duration appears incorrect, please verify working hours";
  const rejectedTimesheet = await api.functional.hrms.member.timesheets.reject(
    managerConnection,
    {
      timesheetId,
      body: {
        rejectionReason,
      } satisfies IHrmsTimesheet.IReject,
    },
  );
  typia.assert(rejectedTimesheet);
  // 5. Validate rejection response
  TestValidator.equals(
    "timesheet status is rejected",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "reviewed_by is manager",
    rejectedTimesheet.reviewer?.id,
    managerAuth.id,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    rejectedTimesheet.reviewed_at !== null &&
      rejectedTimesheet.reviewed_at !== undefined,
  );
}
