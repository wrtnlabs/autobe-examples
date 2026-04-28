import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test that department name uniqueness within the organization is enforced during update operations.
 *
 * Validates that attempting to update a department with a name that already exists for another department in the same organization is rejected by the server. This ensures the organizational structure maintains unique department identifiers and prevents naming conflicts when modifying department details.
 *
 * 1. Member joins and creates default organization.
 * 2. First department is created with a unique name.
 * 3. Second department is created with a different unique name.
 * 4. Attempt to update second department to use the same name as the first department.
 * 5. Validate that the server rejects the update with an error due to the duplicate name constraint within the organization.
 */
export async function test_api_department_update_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create default organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first department with name "Engineering"
  const firstDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
        },
      },
    );
  typia.assert(firstDepartment);
  // 3. Create second department with name "Marketing"
  const secondDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Marketing",
        },
      },
    );
  typia.assert(secondDepartment);
  // 4 & 5. Validate that updating second department with first department's name is rejected
  await TestValidator.error(
    "update rejected for duplicate department name",
    async () => {
      await api.functional.hrmPlatform.member.departments.update(
        memberConnection,
        {
          departmentId: secondDepartment.id,
          body: {
            name: firstDepartment.name,
          } satisfies IHrmPlatformDepartment.IUpdate,
        },
      );
    },
  );
}
