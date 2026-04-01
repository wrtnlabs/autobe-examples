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

export async function test_api_department_creation_with_parent(
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
  // 2. Create top-level parent department (no parent_department_id)
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: null,
        },
      },
    );
  typia.assert(parentDepartment);
  // Verify parent department is top-level (parentDepartment is null)
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parentDepartment,
    null,
  );
  // 3. Create child department with parent_department_id referencing top-level department
  const childDepartment =
    await api.functional.hrmPlatform.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Verify child department has correct parent reference
  TestValidator.predicate(
    "child department has parent reference",
    childDepartment.parentDepartment !== null,
  );
  TestValidator.equals(
    "child parent ID matches",
    childDepartment.parentDepartment!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child parent name matches",
    childDepartment.parentDepartment!.name,
    parentDepartment.name,
  );
  // 5. Verify parent department is top-level (its parent is null)
  TestValidator.equals(
    "parent of child is top-level",
    childDepartment.parentDepartment!.parent,
    null,
  );
  // 6. Verify both departments belong to same organization
  TestValidator.equals(
    "same organization",
    childDepartment.organization.id,
    parentDepartment.organization.id,
  );
}
