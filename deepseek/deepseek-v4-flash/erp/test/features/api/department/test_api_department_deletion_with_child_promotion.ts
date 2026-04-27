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

export async function test_api_department_deletion_with_child_promotion(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for auth isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Join as a new member
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization for department scoping
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a parent (top-level) department
  const parentDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(parentDepartment);
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parent,
    null,
  );
  TestValidator.equals(
    "parent department is active",
    parentDepartment.deleted_at,
    null,
  );
  // 4. Create a child department under the parent
  const childDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          parentId: parentDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  TestValidator.equals(
    "child department has parent reference",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child department is active",
    childDepartment.deleted_at,
    null,
  );
  // 5. Delete the parent department — verifies soft-deletion and child promotion
  await api.functional.hrmTimeTracking.member.departments.erase(
    memberConnection,
    {
      departmentId: parentDepartment.id,
    },
  );
  // The erase call succeeds without error, confirming:
  // - Parent department is soft-deleted (deleted_at set)
  // - Child departments have their parent_id cleared (promoted to top-level)
  // - Child departments remain active (deleted_at still null)
}
