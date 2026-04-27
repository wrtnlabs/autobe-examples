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

/**
 * Test that creating a department with a duplicate name within an organization is rejected.
 *
 * Validates the name uniqueness business rule for departments within the same organization. Creates a department with a specific name, then attempts to create another department with the same name, expecting a 409 Conflict error response.
 *
 * 1. Register a member account via the auth join endpoint.
 * 2. Create a new organization owned by the member.
 * 3. Switch the member's active organization context to the new organization.
 * 4. Create a department with the name "Marketing" — succeeds.
 * 5. Attempt to create another department with the same name "Marketing" — expects 409 Conflict.
 */
export async function test_api_department_create_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch to the organization
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      { organizationId: organization.id },
    );
  typia.assert(switchedOrg);
  // 4. Create a department with a specific name
  const departmentName = "Marketing";
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      { body: { name: departmentName } },
    );
  typia.assert(department);
  TestValidator.equals("department name", department.name, departmentName);
  // 5. Attempt to create a second department with the same name → expect 409 Conflict
  await TestValidator.httpError("duplicate department name", 409, async () => {
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      { body: { name: departmentName } },
    );
  });
}
