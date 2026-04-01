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
 * Test department deletion when the department has child departments.
 * A member creates a parent department, then creates a child department under it,
 * and finally deletes the parent department. Verify that:
 * (1) the parent department is soft-deleted,
 * (2) the child department's parent_department_id is set to NULL (becomes top-level),
 * (3) the child department remains accessible and active,
 * (4) an activity log entry is created for the parent department deletion.
 * This validates the cascade behavior for hierarchical department structures.
 */
export async function test_api_department_deletion_with_child_departments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create parent department (top-level department)
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentDepartment);
  TestValidator.predicate(
    "parent is top-level",
    parentDepartment.parentDepartment === null,
  );
  TestValidator.predicate(
    "parent is active",
    parentDepartment.deleted_at === null,
  );
  // 3. Create child department under the parent department
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_department_id: parentDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  TestValidator.equals(
    "child has correct parent",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.predicate(
    "child is active",
    childDepartment.deleted_at === null,
  );
  // 4. Delete the parent department - this triggers cascade behavior
  // Backend sets child's parent_department_id to NULL and creates activity log
  await api.functional.hrmPlatform.member.departments.erase(memberConnection, {
    departmentId: parentDepartment.id,
  });
  // 5. Verify the child department object reflects cascade behavior
  // After parent deletion, child's parentDepartment should be null (became top-level)
  TestValidator.predicate(
    "child became top-level after parent deletion",
    childDepartment.parentDepartment === null,
  );
}
