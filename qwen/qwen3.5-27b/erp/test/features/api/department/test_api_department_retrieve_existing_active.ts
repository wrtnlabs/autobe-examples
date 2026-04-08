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
 * Test retrieving an existing active department by its unique identifier.
 *
 * Validates the department retrieval operation by creating a department and then fetching it by ID. Ensures that the response contains all required fields including organization reference, parent department (null for top-level), and audit timestamps. Verifies that active departments have null deleted_at values.
 *
 * The test follows the natural workflow: member registration → organization creation → department creation → department retrieval. This ensures proper authentication context and data relationships are established before testing the retrieval endpoint.
 *
 * 1. Register a new member user and authenticate
 * 2. Create an organization for the member
 * 3. Create a department within the organization
 * 4. Retrieve the department by its ID
 * 5. Validate response structure and data integrity
 */
export async function test_api_department_retrieve_existing_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization for the member
  const organization: IHrmTimeTrackOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: prepare_random_hrm_time_track_organization() },
    );
  typia.assert(organization);
  // 3. Create a department in the organization
  const department: IHrmTimeTrackDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      { body: prepare_random_hrm_time_track_department() },
    );
  typia.assert(department);
  // 4. Retrieve the department by ID
  const retrieved: IHrmTimeTrackDepartment =
    await api.functional.hrmTimeTrack.member.departments.at(memberConnection, {
      departmentId: department.id,
    });
  typia.assert(retrieved);
  // 5. Validate response data integrity
  TestValidator.equals("department ID matches", retrieved.id, department.id);
  TestValidator.equals(
    "department name matches",
    retrieved.name,
    department.name,
  );
  TestValidator.equals(
    "department description matches",
    retrieved.description,
    department.description,
  );
  // 6. Validate organization reference
  TestValidator.equals(
    "organization ID matches",
    retrieved.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrieved.organization.name,
    organization.name,
  );
  // 7. Validate active status (deleted_at is null)
  TestValidator.equals(
    "department is active (deleted_at is null)",
    retrieved.deleted_at,
    null,
  );
  // 8. Validate parent department is null for top-level department
  TestValidator.equals(
    "parent department is null for top-level",
    retrieved.parentDepartment,
    null,
  );
  // 9. Validate timestamps exist and are not null
  TestValidator.predicate("created_at exists", retrieved.created_at !== null);
  TestValidator.predicate("updated_at exists", retrieved.updated_at !== null);
}
