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
 * Test successful creation of a new top-level department within an organization.
 * 1. Authenticate as admin to gain authorization for department creation
 * 2. Create a new department with unique name and optional description
 * 3. Validate the response includes all department fields including auto-generated id, timestamps, and null parent
 * 4. Verify the department is a top-level department (parent is null)
 * 5. Verify employee_count is 0 and childDepartments is empty array initially
 */
export async function test_api_department_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new top-level department
  const department =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {},
    );
  // 3. Validate the response structure
  typia.assert(department);
  // 4. Verify business logic for top-level department
  TestValidator.predicate("department has name", department.name.length > 0);
  TestValidator.equals("parent is null for top-level", department.parent, null);
  TestValidator.equals(
    "childDepartments is empty",
    department.childDepartments.length,
    0,
  );
  TestValidator.equals("employee_count is 0", department.employee_count, 0);
  TestValidator.predicate(
    "created_at exists",
    department.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    department.updated_at.length > 0,
  );
  TestValidator.predicate(
    "organization exists",
    department.organization.id.length > 0,
  );
}
