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

export async function test_api_department_name_description_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with organization management permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization to establish context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a department to serve as the update target
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // 4. Execute the update operation changing the department name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updated = await api.functional.erpHrm.member.departments.update(
    memberConnection,
    {
      departmentId: department.id,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IErpHrmDepartment.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Verify the response contains the updated values with correct timestamps
  TestValidator.equals("department name updated", updated.name, newName);
  TestValidator.equals(
    "department description updated",
    updated.description,
    newDescription,
  );
  TestValidator.equals("department ID unchanged", updated.id, department.id);
  TestValidator.equals(
    "organization unchanged",
    updated.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(updated.updatedAt) > new Date(department.createdAt),
  );
}
