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
 * Test that an authenticated admin can successfully retrieve department details by ID.
 * 1. Admin authenticates via join endpoint
 * 2. Admin creates a new department
 * 3. Admin retrieves the created department by ID
 * 4. Validate response structure and all expected fields
 */
export async function test_api_department_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a department
  const createdDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdDepartment);
  // 3. Retrieve the department by ID
  const retrievedDepartment =
    await api.functional.hrmPlatform.admin.departments.at(adminConnection, {
      departmentId: createdDepartment.id,
    });
  typia.assert(retrievedDepartment);
  // 4. Validate response structure and fields
  TestValidator.equals(
    "department ID matches",
    retrievedDepartment.id,
    createdDepartment.id,
  );
  TestValidator.equals(
    "department name matches",
    retrievedDepartment.name,
    createdDepartment.name,
  );
  TestValidator.equals(
    "department description matches",
    retrievedDepartment.description,
    createdDepartment.description,
  );
  TestValidator.predicate(
    "parent is null for top-level department",
    retrievedDepartment.parent === null,
  );
  TestValidator.equals(
    "childDepartments is empty array",
    retrievedDepartment.childDepartments.length,
    0,
  );
  TestValidator.equals(
    "employee_count is zero",
    retrievedDepartment.employee_count,
    0,
  );
  TestValidator.predicate(
    "organization exists",
    retrievedDepartment.organization !== null &&
      retrievedDepartment.organization !== undefined,
  );
  TestValidator.predicate(
    "organization has valid name",
    retrievedDepartment.organization.name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(retrievedDepartment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(retrievedDepartment.updated_at)),
  );
}
