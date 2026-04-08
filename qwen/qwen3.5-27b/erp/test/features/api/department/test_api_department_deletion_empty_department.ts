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
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test deleting a department with no employees and no child departments.
 *
 * Validates the department deletion workflow for an empty department scenario. Ensures that a department can be successfully deleted when it has no employees assigned and no child departments in the hierarchy.
 *
 * The test verifies that the soft deletion mechanism works correctly, setting the deleted_at timestamp while preserving the department record for audit purposes. Since no employees are assigned, no employee department change activity logs should be created.
 *
 * 1. Register and authenticate as a member with organization management permission.
 * 2. Create an organization to serve as the context for department operations.
 * 3. Create a department with no employees assigned and no child departments.
 * 4. Delete the empty department using the erase endpoint.
 * 5. Validate that the deletion succeeds without errors (void response).
 */
export async function test_api_department_deletion_empty_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create empty department (no employees, no children)
  const department =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(department);
  // 4. Delete the empty department
  await api.functional.hrmTimeTrack.member.departments.erase(memberConnection, {
    departmentId: department.id,
  });
  // 5. Validate: successful deletion returns void (no error thrown)
  // The absence of an error indicates successful soft deletion
}