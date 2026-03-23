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

export async function test_api_department_name_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with org:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Create a department with a unique name within the same organization
  const departmentName = `Department_${RandomGenerator.alphaNumeric(8)}`;
  const firstDepartment =
    await api.functional.hrmTracker.member.departments.create(adminConnection, {
      body: {
        name: departmentName,
        description: null,
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    });
  typia.assert(firstDepartment);
  TestValidator.equals(
    "department name matches",
    firstDepartment.name,
    departmentName,
  );
  // 3. Attempt to create another department with the same name (should fail)
  await TestValidator.error("duplicate department name rejected", async () => {
    await api.functional.hrmTracker.member.departments.create(adminConnection, {
      body: {
        name: departmentName, // Same name as first department
        description: null,
        parent_id: null,
      } satisfies IHrmTrackerDepartment.ICreate,
    });
  });
  // 4. Verify system rejects duplicate department name with appropriate error
  // Error validation is handled by TestValidator.error above
  // 5. Confirm that department name uniqueness is enforced within same organization
  // Verified through the successful error validation above
}
