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

export async function test_api_department_retrieve_parent_with_children_count(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization to provide department context
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a parent department (top-level, no parentId)
  const parentDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Sales",
          description: "Sales Department",
        },
      },
    );
  typia.assert(parentDepartment);
  // 4. Create two child departments under the parent
  const child1 =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Domestic Sales",
          description: "Domestic Sales Team",
          parentId: parentDepartment.id,
        },
      },
    );
  typia.assert(child1);
  const child2 =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "International Sales",
          description: "International Sales Team",
          parentId: parentDepartment.id,
        },
      },
    );
  typia.assert(child2);
  // 5. Retrieve the parent department
  const retrieved = await api.functional.hrmTimeTracking.member.departments.at(
    memberConnection,
    {
      departmentId: parentDepartment.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate
  TestValidator.equals(
    "department id matches",
    retrieved.id,
    parentDepartment.id,
  );
  TestValidator.equals("department name matches", retrieved.name, "Sales");
  TestValidator.equals(
    "child departments count",
    retrieved.child_departments_count,
    2,
  );
  TestValidator.predicate(
    "parent is null (top-level)",
    retrieved.parent === null,
  );
}
