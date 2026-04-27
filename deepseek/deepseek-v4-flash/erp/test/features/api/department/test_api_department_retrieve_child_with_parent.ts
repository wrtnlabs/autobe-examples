import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_department_retrieve_child_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuthorized);
  // Step 2: Create an organization to own the departments
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a parent (top-level) department with a specific name
  const parentDepartmentName = "Engineering";
  const parentDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: parentDepartmentName,
          description: "Engineering department",
        },
      },
    );
  typia.assert(parentDepartment);
  // Step 4: Create a child department under the parent
  const childDepartmentName = "Frontend";
  const childDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: childDepartmentName,
          description: "Frontend team",
          parentId: parentDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  // Step 5: Retrieve the child department by its ID
  const retrievedDepartment =
    await api.functional.hrmTimeTracking.member.departments.at(
      memberConnection,
      {
        departmentId: childDepartment.id,
      },
    );
  typia.assert(retrievedDepartment);
  // Step 6: Validate the parent reference in the retrieved child department
  TestValidator.equals(
    "parent department id",
    retrievedDepartment.parent?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent department name",
    retrievedDepartment.parent?.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "child departments count is 0",
    retrievedDepartment.child_departments_count,
    0,
  );
  TestValidator.equals(
    "organization id",
    retrievedDepartment.organization.id,
    organization.id,
  );
}
