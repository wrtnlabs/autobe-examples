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
 * Test department name uniqueness validation during update.
 *
 * This test validates that department names must be unique within an organization.
 * The test creates two departments, attempts to update one to have the same name
 * as the other (which should fail), then successfully updates with a unique name.
 *
 * Steps:
 * 1. Authenticate as a member with org:manage permission
 * 2. Create two departments with different names
 * 3. Attempt to update first department's name to match second (should fail with conflict)
 * 4. Update first department with a unique name (should succeed)
 */
export async function test_api_department_update_name_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create first department
  const department1 =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department1);
  // 3. Create second department with different name
  const department2 =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department2);
  // Verify departments have different names
  TestValidator.notEquals(
    "departments have different names",
    department1.name,
    department2.name,
  );
  // 4. Attempt to update first department's name to match second (should fail)
  await TestValidator.error("duplicate name rejected", async () => {
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department1.id,
        body: {
          name: department2.name,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  });
  // 5. Update first department with a unique name (should succeed)
  const newName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedDepartment =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: department1.id,
        body: {
          name: newName,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedDepartment);
  // Validate update succeeded with new name
  TestValidator.equals("name updated", updatedDepartment.name, newName);
  TestValidator.notEquals(
    "name changed",
    updatedDepartment.name,
    department1.name,
  );
}
