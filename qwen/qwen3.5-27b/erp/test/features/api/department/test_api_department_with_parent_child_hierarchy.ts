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
 * Test department parent-child hierarchical relationship.
 * Creates a parent department and a child department, then validates
 * that the hierarchical relationships are properly represented in both
 * directions (child's parent field and parent's childDepartments array).
 */
export async function test_api_department_with_parent_child_hierarchy(
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
    },
  });
  // 2. Create parent department (top-level, no parent_id)
  const parentDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentDepartment);
  // 3. Create child department with parent_id reference
  const childDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: parentDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  // 4. Retrieve child department and verify parent relationship
  const retrievedChild = await api.functional.hrmPlatform.admin.departments.at(
    adminConnection,
    {
      departmentId: childDepartment.id,
    },
  );
  typia.assert(retrievedChild);
  // Verify child's parent field contains parent department summary
  TestValidator.equals(
    "child department has parent",
    retrievedChild.parent !== null,
    true,
  );
  TestValidator.equals(
    "child department parent id matches",
    retrievedChild.parent?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child department parent name matches",
    retrievedChild.parent?.name,
    parentDepartment.name,
  );
  // 5. Retrieve parent department and verify childDepartments array
  const retrievedParent = await api.functional.hrmPlatform.admin.departments.at(
    adminConnection,
    {
      departmentId: parentDepartment.id,
    },
  );
  typia.assert(retrievedParent);
  // Verify parent's childDepartments array contains the child
  TestValidator.predicate(
    "parent department has child departments",
    retrievedParent.childDepartments.length > 0,
  );
  TestValidator.equals(
    "parent has exactly one child department",
    retrievedParent.childDepartments.length,
    1,
  );
  TestValidator.equals(
    "child department is in parent's childDepartments",
    retrievedParent.childDepartments[0].id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department name matches in parent's list",
    retrievedParent.childDepartments[0].name,
    childDepartment.name,
  );
  // 6. Verify one-level hierarchy constraint
  // Child department should not have any child departments (only top-level can have children)
  TestValidator.equals(
    "child department has no child departments (one-level hierarchy)",
    retrievedChild.childDepartments.length,
    0,
  );
}
