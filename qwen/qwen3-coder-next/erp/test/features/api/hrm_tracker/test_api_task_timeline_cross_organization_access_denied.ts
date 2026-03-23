import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";

export async function test_api_task_timeline_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user in Organization A
  const orgAConnection: api.IConnection = { host: connection.host };
  const orgAMember = await authorize_member_join(orgAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(orgAMember);
  // 2. Create Organization B and user in Organization B
  const orgBConnection: api.IConnection = { host: connection.host };
  const orgBMember = await authorize_member_join(orgBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(orgBMember);
  // Create Organization B
  const organizationB =
    await api.functional.hrmTracker.member.organizations.create(
      orgBConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: randint(1, 12) satisfies number as number,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organizationB);
  // Create employee in Organization B
  const employeeB = await api.functional.hrmTracker.member.employees.create(
    orgBConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: null,
        department_id: null,
        role_id: null,
        organization_id: organizationB.id,
        user_id: orgBMember.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employeeB);
  // Create project in Organization B
  const projectB = await api.functional.hrmTracker.member.projects.create(
    orgBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(projectB);
  // 3. Attempt to access Organization B's project timeline from Organization A user
  // This should be denied
  await TestValidator.error(
    "access denied for cross-organization project",
    async () => {
      await api.functional.hrmTracker.member.projects.tasks.timeline.at(
        orgAConnection,
        {
          projectId: projectB.id,
        },
      );
    },
  );
}