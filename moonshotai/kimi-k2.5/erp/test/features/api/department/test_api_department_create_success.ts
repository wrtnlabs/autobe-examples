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

export async function test_api_department_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create organization to establish organizational context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create department with specific test values
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: "Engineering",
        description: "Software development team",
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 4. Validate business logic - verify input values are correctly persisted
  TestValidator.equals(
    "department name matches input",
    department.name,
    "Engineering",
  );
  TestValidator.equals(
    "department description matches input",
    department.description,
    "Software development team",
  );
  TestValidator.equals(
    "parent department is null for top-level",
    department.parentDepartment,
    null,
  );
  TestValidator.equals(
    "children array is empty",
    department.children.length,
    0,
  );
  TestValidator.equals(
    "department belongs to created organization",
    department.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "deletedAt is null (active department)",
    department.deletedAt === null,
  );
}
