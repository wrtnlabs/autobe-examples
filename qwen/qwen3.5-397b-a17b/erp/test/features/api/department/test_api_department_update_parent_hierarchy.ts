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

export async function test_api_department_update_parent_hierarchy(
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
  // 2. Create a parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // Verify parent department is top-level (no parent)
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parentDepartment,
    null,
  );
  // 3. Create a child department (initially top-level, will be updated)
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // Verify child department is initially top-level
  TestValidator.equals(
    "child department initially has no parent",
    childDepartment.parentDepartment,
    null,
  );
  // 4. Update child department to assign parent department
  const updatedChildWithParent =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: childDepartment.id,
        body: {
          parentDepartmentId: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedChildWithParent);
  // 5. Verify the response shows the parent department relationship
  TestValidator.notEquals(
    "child department now has parent",
    updatedChildWithParent.parentDepartment,
    null,
  );
  if (updatedChildWithParent.parentDepartment !== null) {
    typia.assertGuard(updatedChildWithParent.parentDepartment!);
    TestValidator.equals(
      "parent ID matches",
      updatedChildWithParent.parentDepartment.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent name matches",
      updatedChildWithParent.parentDepartment.name,
      parentDepartment.name,
    );
  }
  // 6. Test removing parent assignment by updating with null parentDepartmentId
  const updatedChildWithoutParent =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: childDepartment.id,
        body: {
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedChildWithoutParent);
  // 7. Verify the department becomes top-level
  TestValidator.equals(
    "child department is now top-level",
    updatedChildWithoutParent.parentDepartment,
    null,
  );
}
