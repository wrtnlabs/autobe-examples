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

export async function test_api_department_deletion_with_child_departments_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create parent department
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(parentDepartment);
  // 3. Create child department under the parent
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // Verify child department has parent reference
  TestValidator.equals(
    "child department parent_id matches parent",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  // 4. Attempt to delete parent department - should fail
  await TestValidator.error(
    "deleting parent with child departments rejected",
    async () => {
      await api.functional.hrmPlatform.member.departments.erase(
        memberConnection,
        {
          departmentId: parentDepartment.id,
        },
      );
    },
  );
  // 5. Verify parent department still exists by attempting to create another child under it
  // (This indirectly confirms parent is still active)
  const anotherChildDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(anotherChildDepartment);
  // 6. Verify child departments remain intact
  TestValidator.equals(
    "first child department parent unchanged",
    childDepartment.parent?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "second child department parent matches",
    anotherChildDepartment.parent?.id,
    parentDepartment.id,
  );
}
