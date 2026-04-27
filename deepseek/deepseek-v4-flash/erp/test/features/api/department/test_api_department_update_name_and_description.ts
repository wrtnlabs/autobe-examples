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

export async function test_api_department_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 1. Create two departments with distinct names
  const department1Name = RandomGenerator.name();
  const department2Name = RandomGenerator.name();
  const department1 =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: department1Name,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department1);
  const department2 =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: department2Name,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department2);
  // 2. Update the first department's name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updated =
    await api.functional.hrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: department1.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(updated);
  // 3. Verify the updated department record
  TestValidator.equals("department name updated", updated.name, newName);
  TestValidator.equals(
    "department description updated",
    updated.description,
    newDescription,
  );
  TestValidator.equals("department id unchanged", updated.id, department1.id);
  TestValidator.equals("parent unchanged (null)", updated.parent, null);
  TestValidator.predicate(
    "updated_at refreshed",
    updated.updated_at > department1.updated_at,
  );
  // 4. Attempt to rename second department with the already-taken name → expect 409 Conflict
  await TestValidator.httpError(
    "duplicate department name rejects with 409",
    409,
    async () => {
      await api.functional.hrmTimeTracking.member.departments.update(
        memberConnection,
        {
          departmentId: department2.id,
          body: {
            name: newName,
          } satisfies IHrmTimeTrackingDepartment.IUpdate,
        },
      );
    },
  );
}
