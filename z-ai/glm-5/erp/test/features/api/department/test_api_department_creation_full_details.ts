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

export async function test_api_department_creation_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Prepare department creation data with all optional fields populated
  const departmentName = RandomGenerator.paragraph({ sentences: 2 });
  const departmentDescription = RandomGenerator.content({ paragraphs: 3 });
  const createBody = {
    name: departmentName,
    description: departmentDescription,
  } satisfies IErpHrmDepartment.ICreate;
  // 3. Create the department
  const department = await api.functional.erpHrm.member.departments.create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(department);
  // 4. Validate department basic fields match input
  TestValidator.equals("name matches input", department.name, departmentName);
  TestValidator.equals(
    "description matches input",
    department.description,
    departmentDescription,
  );
  // 5. Validate new department state
  TestValidator.equals("deleted_at is null", department.deleted_at, null);
  TestValidator.equals(
    "timestamps identical on creation",
    department.created_at,
    department.updated_at,
  );
  TestValidator.equals(
    "parent is null for top-level department",
    department.parent,
    null,
  );
  // 6. Validate organization summary exists
  TestValidator.predicate(
    "organization has owner",
    department.organization.owner !== undefined,
  );
}
