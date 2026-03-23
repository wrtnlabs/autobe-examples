import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that an employee can successfully update their own timelog when it is not associated with any timesheet.
 * This test verifies the timelog update workflow for the owner without timesheet constraints.
 */
export async function test_api_timelog_update_by_owner_without_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member (employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project in the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a timelog for the authenticated employee on that project
  const originalTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: new Date().toISOString(),
          duration: 60,
          billable: true,
          description: "Original work description",
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(originalTimelog);
  // Store original values for validation
  const originalDuration = originalTimelog.duration;
  const originalBillable = originalTimelog.billable;
  const originalDate = originalTimelog.date;
  const originalCreatedAt = originalTimelog.created_at;
  // 4. Update the timelog with new values
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: originalTimelog.id,
      body: {
        duration: originalDuration + 30,
        description: "Updated work description after modification",
        billable: !originalBillable,
      } satisfies IHrmPlatformTimelog.IUpdate,
    });
  typia.assert(updatedTimelog);
  // 5. Validate the updated timelog
  TestValidator.equals(
    "timelog ID remains unchanged",
    updatedTimelog.id,
    originalTimelog.id,
  );
  TestValidator.equals(
    "date field is immutable",
    updatedTimelog.date,
    originalDate,
  );
  TestValidator.notEquals(
    "duration has been updated",
    updatedTimelog.duration,
    originalDuration,
  );
  TestValidator.equals(
    "duration matches new value",
    updatedTimelog.duration,
    originalDuration + 30,
  );
  TestValidator.equals(
    "description has been updated",
    updatedTimelog.description,
    "Updated work description after modification",
  );
  TestValidator.equals(
    "billable status has been toggled",
    updatedTimelog.billable,
    !originalBillable,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedTimelog.updated_at) > new Date(originalCreatedAt),
  );
  TestValidator.equals(
    "project reference is preserved",
    updatedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee reference is preserved",
    updatedTimelog.employee.id,
    member.id,
  );
}
