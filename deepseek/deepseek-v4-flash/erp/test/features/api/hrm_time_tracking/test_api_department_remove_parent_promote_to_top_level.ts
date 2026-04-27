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
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_remove_parent_promote_to_top_level(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Join as a member
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  //----
  // 2. Create the parent department "Sales"
  //----
  const salesDepartment: IHrmTimeTrackingDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Sales-${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(salesDepartment);
  TestValidator.predicate(
    "parent department has no parent",
    () => salesDepartment.parent === null,
  );
  //----
  // 3. Create the child department "Enterprise Sales" under "Sales"
  //----
  const enterpriseSalesDepartment: IHrmTimeTrackingDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `EnterpriseSales-${RandomGenerator.alphabets(8)}`,
          parentId: salesDepartment.id,
        },
      },
    );
  typia.assert(enterpriseSalesDepartment);
  TestValidator.equals(
    "child department has correct parent",
    enterpriseSalesDepartment.parent?.id,
    salesDepartment.id,
  );
  //----
  // 4. Remove the parent to promote to top-level
  //----
  const promotedDepartment: IHrmTimeTrackingDepartment =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: enterpriseSalesDepartment.id,
        body: {
          name: enterpriseSalesDepartment.name,
          parentId: null,
        } satisfies IHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(promotedDepartment);
  TestValidator.predicate(
    "promoted department has no parent",
    () => promotedDepartment.parent === null,
  );
  //----
  // 5. Reassign to a new parent
  //----
  const operationsDepartment: IHrmTimeTrackingDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Operations-${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(operationsDepartment);
  const reassignedDepartment: IHrmTimeTrackingDepartment =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: enterpriseSalesDepartment.id,
        body: {
          name: enterpriseSalesDepartment.name,
          parentId: operationsDepartment.id,
        } satisfies IHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(reassignedDepartment);
  TestValidator.equals(
    "reassigned department has correct new parent",
    reassignedDepartment.parent?.id,
    operationsDepartment.id,
  );
}
