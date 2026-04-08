import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";

/**
 * Test successful department update operation.
 *
 * Validates the complete department update workflow including member authentication, department creation, and department modification. Ensures that department name and description updates are properly persisted and returned with correct timestamps and preserved relationships.
 *
 * Special attention is given to verifying that the department ID remains unchanged after update, the updated_at timestamp is more recent than created_at, and organization references are maintained.
 *
 * 1. Authenticate as a member using authorize_member_join utility.
 * 2. Create a department using generate_random_hrm_time_track_member_departments_create utility.
 * 3. Update the department with new name and description.
 * 4. Validate the response contains updated values and correct timestamps.
 */
export async function test_api_department_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a department
  const department: IHrmTimeTrackDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(department);
  // 3. Update the department
  const updated: IHrmTimeTrackDepartment =
    await api.functional.hrmTimeTrack.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: "Engineering Department",
          description: "Software development team",
        } satisfies IHrmTimeTrackDepartment.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Validate updated department
  TestValidator.equals("department ID preserved", updated.id, department.id);
  TestValidator.equals("name updated", updated.name, "Engineering Department");
  TestValidator.equals(
    "description updated",
    updated.description,
    "Software development team",
  );
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(updated.updated_at) > new Date(updated.created_at),
  );
  TestValidator.equals(
    "organization preserved",
    updated.organization.id,
    department.organization.id,
  );
  TestValidator.equals(
    "parent department preserved",
    updated.parentDepartment?.id,
    department.parentDepartment?.id,
  );
}
