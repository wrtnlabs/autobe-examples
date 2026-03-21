import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_department_creation_with_parent_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create the parent department (top-level, no parent)
  const parentDepartment =
    await api.functional.erpHrm.member.departments.create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  // 3. Create a child department with parent_id referencing the parent
  const childDepartment = await api.functional.erpHrm.member.departments.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(childDepartment);
  // 4. Validate the parent department is top-level (has no parent)
  TestValidator.predicate(
    "parent department is top-level",
    parentDepartment.parent === null,
  );
  // 5. Validate the child department has a parent reference
  TestValidator.predicate(
    "child department has parent",
    childDepartment.parent !== null,
  );
  // 6. Validate the parent field contains correct parent department summary
  const childParent = childDepartment.parent!;
  TestValidator.equals(
    "parent id matches",
    childParent.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent name matches",
    childParent.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "parent description matches",
    childParent.description,
    parentDepartment.description,
  );
  TestValidator.predicate(
    "parent's parent is null (top-level)",
    childParent.parent === null,
  );
  // 7. Validate both departments are in the same organization
  TestValidator.equals(
    "same organization",
    childDepartment.organization.id,
    parentDepartment.organization.id,
  );
}
