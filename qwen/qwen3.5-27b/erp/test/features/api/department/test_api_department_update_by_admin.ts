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
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test department update by admin.
 * 1. Admin authenticates via join
 * 2. Admin creates a department
 * 3. Admin updates the department with new name and description
 * 4. Verify updated department has correct values
 */
export async function test_api_department_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a department
  const department =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Engineering",
          description: "Software development team",
        },
      },
    );
  typia.assert(department);
  const originalCreatedAt = department.created_at;
  const originalUpdatedAt = department.updated_at;
  const originalOrganizationId = department.organization.id;
  // 3. Update the department
  const updatedDepartment =
    await api.functional.hrmPlatform.admin.departments.update(adminConnection, {
      departmentId: department.id,
      body: {
        name: "Engineering Department",
        description: "Core software development and engineering team",
      } satisfies IHrmPlatformDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  // 4. Validate updated department
  TestValidator.equals(
    "name updated",
    updatedDepartment.name,
    "Engineering Department",
  );
  TestValidator.equals(
    "description updated",
    updatedDepartment.description,
    "Core software development and engineering team",
  );
  TestValidator.equals("id unchanged", updatedDepartment.id, department.id);
  TestValidator.equals(
    "organization unchanged",
    updatedDepartment.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedDepartment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedDepartment.updated_at !== originalUpdatedAt,
  );
}
