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

export async function test_api_department_assign_parent_to_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create two top-level departments
  const engineering =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: { name: "Engineering" },
      },
    );
  typia.assert(engineering);
  const frontend =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: { name: "Frontend" },
      },
    );
  typia.assert(frontend);
  // 3. Assign Frontend as parent of Engineering
  const updated =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: engineering.id,
        body: {
          name: engineering.name,
          parentId: frontend.id,
        } satisfies IHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Verify parent reference
  TestValidator.equals("parent id matches", updated.parent?.id, frontend.id);
  TestValidator.equals("parent name matches", updated.parent?.name, "Frontend");
  // 5. Create another top-level department for nesting violation test
  const backend =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: { name: "Backend" },
      },
    );
  typia.assert(backend);
  // 6. Attempt to assign a parent to a department that already has a parent (Engineering already has parent Frontend)
  await TestValidator.httpError(
    "one-level nesting violation: department with existing parent cannot be assigned another parent",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.departments.update(
        memberConnection,
        {
          departmentId: engineering.id,
          body: {
            name: engineering.name,
            parentId: backend.id,
          } satisfies IHrmTimeTrackingDepartment.IUpdate,
        },
      );
    },
  );
  // 7. Attempt to assign a non-existent department UUID as parent
  await TestValidator.httpError(
    "non-existent parent department",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.departments.update(
        memberConnection,
        {
          departmentId: backend.id,
          body: {
            name: backend.name,
            parentId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmTimeTrackingDepartment.IUpdate,
        },
      );
    },
  );
  // 8. Cross-org access enforcement: create a second member and try to update the first member's department
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherConnection, {});
  await TestValidator.httpError(
    "cross-org department access",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.departments.update(
        otherConnection,
        {
          departmentId: engineering.id,
          body: {
            name: engineering.name,
            parentId: frontend.id,
          } satisfies IHrmTimeTrackingDepartment.IUpdate,
        },
      );
    },
  );
}
