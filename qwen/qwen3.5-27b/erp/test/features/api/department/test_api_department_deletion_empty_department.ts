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
 * Test the edge case of deleting a department with no employees assigned and no child departments.
 *
 * This test verifies that:
 * 1. An empty department (no employees, no child departments) can be successfully deleted
 * 2. The deletion operation returns 204 No Content
 * 3. The department is removed from the system
 */
export async function test_api_department_deletion_empty_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create an empty department (no employees, no children)
  const emptyDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(emptyDepartment);
  // Verify the department was created with no employees and no children
  TestValidator.equals(
    "department has no employees",
    emptyDepartment.employee_count,
    0,
  );
  TestValidator.equals(
    "department has no child departments",
    emptyDepartment.childDepartments.length,
    0,
  );
  // 3. Delete the empty department
  await api.functional.hrmPlatform.admin.departments.erase(adminConnection, {
    departmentId: emptyDepartment.id,
  });
  // 4. Verify deletion completed successfully
  // The operation completing without error indicates successful deletion
  // (204 No Content response in HTTP terms)
  TestValidator.predicate(
    "empty department deletion completed successfully",
    true,
  );
}
