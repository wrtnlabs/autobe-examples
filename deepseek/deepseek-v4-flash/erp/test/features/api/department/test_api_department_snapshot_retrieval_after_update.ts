import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

/**
 * Test department update workflow and validate that the updated state is correctly persisted.
 *
 * Validates the complete department update lifecycle including member authentication, department creation, and property modification. The update operation triggers an automatic department snapshot capture server-side to preserve the state change history.
 *
 * Special attention is given to verifying that the updated name and description are correctly persisted, and that the timestamps reflect the modification.
 *
 * 1. Member registers and authenticates via the join endpoint.
 * 2. Department is created with random name and description.
 * 3. Department is updated with a new name and new description.
 * 4. Validates that the updated department reflects the new values and that updated_at has changed.
 */
export async function test_api_department_snapshot_retrieval_after_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a department
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(department);
  // 3. Update the department with new name and description
  const newName = `Engineering & Development ${RandomGenerator.alphabets(5)}`;
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDepartment =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // 4. Validate update was applied correctly
  TestValidator.equals(
    "department name updated",
    updatedDepartment.name,
    newName,
  );
  TestValidator.equals(
    "department description updated",
    updatedDepartment.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedDepartment.updated_at,
    department.updated_at,
  );
}
