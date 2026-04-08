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
 * Test retrieving a department that has a parent department (child department in hierarchy).
 *
 * Validates the department retrieval endpoint with hierarchical relationships. Ensures that when retrieving a child department, the parent department reference is correctly populated in the response.
 *
 * Special attention is given to verifying that the parentDepartment field is not null and contains the correct parent department summary information including id, name, description, and created_at.
 *
 * 1. Register and authenticate as a member user
 * 2. Create an organization for the member to belong to
 * 3. Create a parent department (top-level, no parent)
 * 4. Create a child department with the parent department reference
 * 5. Retrieve the child department by ID
 * 6. Validate the parentDepartment field is not null and contains correct parent information
 */
export async function test_api_department_retrieve_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Test Organization",
          description: "Organization for testing department hierarchy",
        },
      },
    );
  typia.assert(organization);
  // 3. Create a parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Parent Department",
          description: "Top-level department with no parent",
          parent_department_id: null,
        },
      },
    );
  typia.assert(parentDepartment);
  // 4. Create a child department with parent reference
  const childDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Child Department",
          description: "Child department with parent reference",
          parent_department_id: parentDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  // 5. Retrieve the child department by ID
  const retrievedDepartment =
    await api.functional.hrmTimeTrack.member.departments.at(memberConnection, {
      departmentId: childDepartment.id,
    });
  typia.assert(retrievedDepartment);
  // 6. Validate parentDepartment is not null
  TestValidator.predicate(
    "parentDepartment should not be null for child department",
    retrievedDepartment.parentDepartment !== null,
  );
  // 7. Validate parentDepartment contains correct information
  if (retrievedDepartment.parentDepartment !== null) {
    TestValidator.equals(
      "parentDepartment.id matches parent department ID",
      retrievedDepartment.parentDepartment.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parentDepartment.name matches parent department name",
      retrievedDepartment.parentDepartment.name,
      parentDepartment.name,
    );
    TestValidator.equals(
      "parentDepartment.description matches parent department description",
      retrievedDepartment.parentDepartment.description,
      parentDepartment.description,
    );
  }
  // 8. Validate child department fields
  TestValidator.equals(
    "child department name matches",
    retrievedDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "child department description matches",
    retrievedDepartment.description,
    childDepartment.description,
  );
  TestValidator.equals(
    "child department organization matches",
    retrievedDepartment.organization.id,
    organization.id,
  );
}