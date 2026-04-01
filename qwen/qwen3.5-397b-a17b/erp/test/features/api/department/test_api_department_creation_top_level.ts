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
 * Test creating a top-level department within an organization.
 *
 * This test validates the primary success path for department creation:
 * 1. Authenticate as a member with org:manage permission
 * 2. Create a top-level department (no parent) with required name and optional description
 * 3. Verify response contains complete department object with all required fields
 * 4. Verify parentDepartment is null for top-level department
 * 5. Verify department name uniqueness constraint (duplicate should fail)
 */
export async function test_api_department_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 2. Create top-level department with required name and optional description
  const departmentName = RandomGenerator.paragraph({ sentences: 1 });
  const departmentDescription = RandomGenerator.content({ paragraphs: 1 });
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: departmentDescription,
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 3. Verify business logic - name and description match input
  TestValidator.equals(
    "department name matches",
    department.name,
    departmentName,
  );
  TestValidator.equals(
    "department description matches",
    department.description,
    departmentDescription,
  );
  // 4. Verify top-level department has null parentDepartment
  TestValidator.equals(
    "parentDepartment is null for top-level",
    department.parentDepartment,
    null,
  );
  // 5. Verify active department has null deleted_at
  TestValidator.equals(
    "deleted_at is null for active department",
    department.deleted_at,
    null,
  );
  // 6. Verify department name uniqueness - duplicate should fail
  await TestValidator.error(
    "duplicate department name should fail",
    async () => {
      await api.functional.hrmPlatform.member.departments.create(
        memberConnection,
        {
          body: {
            name: departmentName,
            description: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IHrmPlatformDepartment.ICreate,
        },
      );
    },
  );
}
