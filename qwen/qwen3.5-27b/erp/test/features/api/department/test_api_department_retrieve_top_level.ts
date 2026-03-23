import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test retrieving a top-level department's complete information.
 * 1. Admin creates a top-level department
 * 2. Member retrieves the department
 * 3. Verify all fields including parent (null), childDepartments, employee_count, organization
 */
export async function test_api_department_retrieve_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create top-level department
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const department =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 2. Member setup - retrieve department
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const retrieved = await api.functional.hrmPlatform.member.departments.at(
    memberConnection,
    {
      departmentId: department.id,
    },
  );
  typia.assert(retrieved);
  // 3. Validate top-level department structure
  TestValidator.equals("department id matches", retrieved.id, department.id);
  TestValidator.equals(
    "department name matches",
    retrieved.name,
    department.name,
  );
  TestValidator.equals("parent is null for top-level", retrieved.parent, null);
  TestValidator.predicate(
    "childDepartments is array",
    Array.isArray(retrieved.childDepartments),
  );
  TestValidator.predicate(
    "employee_count is non-negative",
    retrieved.employee_count >= 0,
  );
  TestValidator.predicate(
    "organization exists",
    retrieved.organization.id !== undefined,
  );
  TestValidator.equals(
    "organization id matches",
    retrieved.organization.id,
    department.organization.id,
  );
}
