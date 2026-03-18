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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_retrieve_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization for the departments
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  // Create child department with parentDepartmentId referencing the parent
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentDepartmentId: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(childDepartment);
  // Retrieve the child department
  const retrievedDepartment = await api.functional.erpHrm.member.departments.at(
    memberConnection,
    {
      departmentId: childDepartment.id,
    },
  );
  typia.assert(retrievedDepartment);
  // Verify parentDepartment is populated with correct summary
  TestValidator.equals(
    "parentDepartment should not be null",
    retrievedDepartment.parentDepartment !== null,
    true,
  );
  TestValidator.equals(
    "parentDepartment id matches parent",
    retrievedDepartment.parentDepartment!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parentDepartment name matches parent",
    retrievedDepartment.parentDepartment!.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "parentDepartment description matches parent",
    retrievedDepartment.parentDepartment!.description,
    parentDepartment.description,
  );
}
