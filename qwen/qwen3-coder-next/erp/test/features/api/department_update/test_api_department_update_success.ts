import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";

export async function test_api_department_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Create parent department
  const parentDepartment =
    await api.functional.hrmTracker.member.departments.create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  // 3. Create child department under parent
  const childDepartment =
    await api.functional.hrmTracker.member.departments.create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: parentDepartment.id,
      } satisfies IHrmTrackerDepartment.ICreate,
    });
  typia.assert(childDepartment);
  // 4. Update child department
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDepartment =
    await api.functional.hrmTracker.member.departments.update(adminConnection, {
      departmentId: childDepartment.id,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies IHrmTrackerDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  // 5. Verify update results
  TestValidator.equals(
    "department name updated",
    updatedDepartment.name,
    updatedName,
  );
  TestValidator.equals(
    "description updated when provided",
    updatedDepartment.description ?? "",
    updatedDescription ?? "",
  );
  if (updatedDepartment.parent !== null) {
    TestValidator.equals(
      "parent relationship preserved",
      updatedDepartment.parent.id,
      parentDepartment.id,
    );
  } else {
    throw new Error("Parent department is null after update");
  }
  TestValidator.equals(
    "children count preserved",
    updatedDepartment.children_count,
    0,
  );
}
