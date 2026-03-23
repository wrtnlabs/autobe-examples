import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";

export async function test_api_department_delete_failure_employees_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Create department
  const department =
    await generate_random_hrm_tracker_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: null,
          parent_id: null,
        } satisfies IHrmTrackerDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 3. Create employee assigned to department
  const employee = await generate_random_hrm_tracker_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "full-time" as const,
        status: "active" as const,
        position: null,
        department_id: department.id,
        role_id: null,
        organization_id: department.id, // use department.id as fallback for organization_id
        user_id: member.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Attempt to delete department and verify error
  await TestValidator.error(
    "department_has_employees error when employees assigned",
    async () => {
      await api.functional.hrmTracker.member.departments.erase(
        memberConnection,
        {
          departmentId: department.id,
        },
      );
    },
  );
  // 5. Verify department still exists
  const retrieved = await api.functional.hrmTracker.member.departments.create(
    memberConnection,
    {
      body: {
        name: department.name,
        description: department.description ?? null,
        parent_id: department.parent ? department.parent.id : null,
      } satisfies IHrmTrackerDepartment.ICreate,
    },
  );
  typia.assert(retrieved);
  TestValidator.equals("department still exists", retrieved.id, department.id);
}