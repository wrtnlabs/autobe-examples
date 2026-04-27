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

export async function test_api_department_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the member actor
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Join as a member to obtain JWT tokens
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch to the created organization to set active org context
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberConnection,
      { organizationId: organization.id },
    );
  typia.assert(switchedOrg);
  // 4. Create a top-level department (no parent) with a specific name
  const department =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
          parentId: null,
        },
      },
    );
  typia.assert(department);
  // 5. Validate business logic of the created department
  TestValidator.equals("department name", department.name, "Engineering");
  TestValidator.equals("parent is null (top-level)", department.parent, null);
  TestValidator.equals("description is null", department.description, null);
  TestValidator.equals(
    "child departments count is 0",
    department.child_departments_count,
    0,
  );
  TestValidator.equals(
    "organization reference matches",
    department.organization.id,
    organization.id,
  );
}
