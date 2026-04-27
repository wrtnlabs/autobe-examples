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

export async function test_api_department_retrieve_top_level(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create top-level department (no parentId)
  const department: IHrmTimeTrackingDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          parentId: undefined,
        },
      },
    );
  typia.assert(department);
  // Retrieve the department by its ID
  const retrieved: IHrmTimeTrackingDepartment =
    await api.functional.hrmTimeTracking.member.departments.at(
      memberConnection,
      {
        departmentId: department.id,
      },
    );
  typia.assert(retrieved);
  // Validate business logic
  TestValidator.equals("department id matches", retrieved.id, department.id);
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
  TestValidator.predicate(
    "parent is null (top-level)",
    retrieved.parent === null,
  );
  TestValidator.equals(
    "organization id matches",
    retrieved.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "child_departments_count is 0",
    retrieved.child_departments_count,
    0,
  );
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
}
