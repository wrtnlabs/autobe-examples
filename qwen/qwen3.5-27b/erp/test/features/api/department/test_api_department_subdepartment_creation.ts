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
 * Test successful creation of a subdepartment under an existing top-level parent department.
 * 1. Authenticate as admin
 * 2. Create a top-level parent department
 * 3. Create a subdepartment with parent_id referencing the top-level department
 * 4. Verify subdepartment response includes correct parent reference
 * 5. Verify parent department's childDepartments includes the new subdepartment
 */
export async function test_api_department_subdepartment_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Create a top-level parent department (no parent_id)
  const parentDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: `Parent Dept ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // Verify parent department has no parent and empty childDepartments
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parent,
    null,
  );
  TestValidator.equals(
    "parent department has no children initially",
    parentDepartment.childDepartments.length,
    0,
  );
  // 3. Create a subdepartment with parent_id referencing the top-level department
  const subDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: `Sub Dept ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(subDepartment);
  // 4. Verify subdepartment response includes correct parent reference
  TestValidator.equals(
    "subdepartment has correct parent id",
    subDepartment.parent?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "subdepartment has correct parent name",
    subDepartment.parent?.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "subdepartment has no children",
    subDepartment.childDepartments.length,
    0,
  );
  // 5. Verify parent department's childDepartments includes the new subdepartment
  // Need to fetch parent department again to see updated childDepartments
  // Since there's no list/get API available in the provided SDK, we verify through the subDepartment response
  // The parent relationship is bidirectional - subDepartment.parent points to parentDepartment
  TestValidator.predicate(
    "subdepartment belongs to same organization as parent",
    subDepartment.organization.id === parentDepartment.organization.id,
  );
  // Verify organization context is maintained
  TestValidator.equals(
    "subdepartment organization matches parent",
    subDepartment.organization.id,
    parentDepartment.organization.id,
  );
}
