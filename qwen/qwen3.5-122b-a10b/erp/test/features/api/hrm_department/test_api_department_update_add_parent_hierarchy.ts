import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_departments_create } from "../../../generate/generate_random_hrm_member_organizations_departments_create";
import { prepare_random_hrm_department } from "../../../prepare/prepare_random_hrm_department";

export async function test_api_department_update_add_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // Create organization for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create parent department (root-level)
  const parentDepartment: IHrmDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: `Parent ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(parentDepartment);
  TestValidator.predicate(
    "parent is root-level",
    parentDepartment.parent === null,
  );
  // 3. Create child department (initially root-level)
  const childDepartment: IHrmDepartment =
    await generate_random_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: `Child ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmDepartment.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(childDepartment);
  TestValidator.predicate(
    "child is initially root-level",
    childDepartment.parent === null,
  );
  // 4. Update child department to add parent
  const updatedChild: IHrmDepartment =
    await api.functional.hrm.member.organizations.departments.update(
      memberConnection,
      {
        organizationId,
        departmentId: childDepartment.id,
        body: {
          parent_department_id: parentDepartment.id,
        } satisfies IHrmDepartment.IUpdate,
      },
    );
  typia.assert(updatedChild);
  // 5. Validate parent reference in response
  TestValidator.equals(
    "parent id matches",
    updatedChild.parent?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent name matches",
    updatedChild.parent?.name,
    parentDepartment.name,
  );
  TestValidator.predicate(
    "parent has created_at",
    updatedChild.parent?.created_at !== undefined,
  );
  // 6. Verify one-level nesting constraint
  TestValidator.predicate(
    "parent is still root-level",
    updatedChild.parent?.parent_department === null,
  );
}
