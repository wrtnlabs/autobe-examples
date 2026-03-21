import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_creation_on_own_project(
  connection: api.IConnection,
): Promise<void> {
  // Test successful creation of a timelog when an employee logs work time
  // against a project they created. Steps:
  // 1) Authenticate as a new member (creates first organization with owner role
  //    and active employee record).
  // 2) Create a project as the organization owner.
  // 3) Create a timelog specifying the project_id, date, duration, optional
  //    description, and billable status.
  // 4) Verify that the timelog is created successfully with all provided fields.
  // 5) Verify that the billable field defaults to true when not specified.
  // 6) Verify that the response includes the complete timelog entity with
  //    generated id, employee reference, project reference, and timestamps.
  // 7) Verify that the employee association reflects the authenticated member's
  //    employee record.
  // Step 1: Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(memberAuth);
  // Step 2: Create a project as the organization owner
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create a timelog with explicit billable value
  const duration1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const description1 = RandomGenerator.paragraph({ sentences: 3 });
  const timelogData = {
    project_id: project.id,
    date: new Date().toISOString(),
    duration: duration1,
    description: description1,
    billable: true,
  } satisfies IErpHrmTimelog.ICreate;
  const timelog = await api.functional.erpHrm.member.timelogs.create(
    memberConnection,
    { body: timelogData },
  );
  typia.assert(timelog);
  // Step 4: Verify the timelog was created successfully with all provided fields
  TestValidator.equals("project id matches", timelog.project.id, project.id);
  TestValidator.equals("duration matches", timelog.duration, duration1);
  TestValidator.equals(
    "description matches",
    timelog.description,
    description1,
  );
  TestValidator.equals("billable matches", timelog.billable, true);
  // Step 5: Create another timelog without billable to test default value
  const duration2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const description2 = RandomGenerator.paragraph({ sentences: 2 });
  const timelogDataNoBillable = {
    project_id: project.id,
    date: new Date().toISOString(),
    duration: duration2,
    description: description2,
    // billable not specified - should default to true
  } satisfies IErpHrmTimelog.ICreate;
  const timelogDefaultBillable =
    await api.functional.erpHrm.member.timelogs.create(memberConnection, {
      body: timelogDataNoBillable,
    });
  typia.assert(timelogDefaultBillable);
  // Verify billable defaults to true
  TestValidator.equals(
    "billable defaults to true",
    timelogDefaultBillable.billable,
    true,
  );
  // Step 6: Verify the complete timelog entity structure
  // Note: typia.assert() already validates all type constraints including
  // id format, timestamps, etc. We verify business logic here.
  // Step 7: Verify that the employee association reflects the authenticated member
  TestValidator.equals(
    "employee member id matches",
    timelog.employee.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "default billable employee member id matches",
    timelogDefaultBillable.employee.member.id,
    memberAuth.id,
  );
  // Verify project associations are correct
  TestValidator.equals(
    "project id in response matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "default billable project id matches",
    timelogDefaultBillable.project.id,
    project.id,
  );
}
