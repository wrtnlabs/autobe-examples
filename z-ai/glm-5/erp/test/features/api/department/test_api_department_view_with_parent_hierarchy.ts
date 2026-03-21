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

export async function test_api_department_view_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(parentDepartment);
  // 3. Create child department under the parent
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: parentDepartment.id,
      },
    });
  typia.assert(childDepartment);
  // 4. Retrieve child department to view parent hierarchy
  const retrievedDepartment = await api.functional.erpHrm.member.departments.at(
    memberConnection,
    {
      departmentId: childDepartment.id,
    },
  );
  typia.assert(retrievedDepartment);
  // 5. Validate department basic properties
  TestValidator.equals(
    "department id",
    retrievedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "department name",
    retrievedDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "department description",
    retrievedDepartment.description,
    childDepartment.description,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedDepartment.deleted_at === null,
  );
  // 6. Validate parent relationship exists
  TestValidator.predicate("parent exists", retrievedDepartment.parent !== null);
  typia.assertGuard(retrievedDepartment.parent!);
  TestValidator.equals(
    "parent id matches",
    retrievedDepartment.parent.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent name matches",
    retrievedDepartment.parent.name,
    parentDepartment.name,
  );
  // 7. Validate organization reference matches parent department's organization
  TestValidator.equals(
    "organization id matches",
    retrievedDepartment.organization.id,
    parentDepartment.organization.id,
  );
}
