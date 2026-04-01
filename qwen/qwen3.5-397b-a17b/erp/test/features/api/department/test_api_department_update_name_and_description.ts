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
 * Test the primary success path for updating a department's name and description.
 *
 * Workflow:
 * 1. Authenticate as a member with org:manage permission using authorize_member_join
 * 2. Create a department within the organization using generate_random_hrm_platform_member_departments_create
 * 3. Update the department's name to a new unique name and modify the description
 * 4. Verify the response contains the updated department entity with the new name and description
 * 5. Verify the updated_at timestamp has changed
 *
 * This validates the core department update functionality for basic attribute modifications.
 */
export async function test_api_department_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a department to be updated
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 3. Update the department's name and description
  const newName = RandomGenerator.paragraph({ sentences: 1 });
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDepartment =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // 4. Verify the updated values
  TestValidator.equals("name updated", updatedDepartment.name, newName);
  TestValidator.equals(
    "description updated",
    updatedDepartment.description,
    newDescription,
  );
  TestValidator.equals("id unchanged", updatedDepartment.id, department.id);
  // 5. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedDepartment.updated_at,
    department.updated_at,
  );
}
