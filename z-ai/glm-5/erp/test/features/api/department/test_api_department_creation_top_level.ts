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

export async function test_api_department_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (creates first organization, becomes owner with org:manage permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create top-level department (no parent_id)
  const departmentName = RandomGenerator.name();
  const departmentDescription = RandomGenerator.paragraph({ sentences: 3 });
  const department = await api.functional.erpHrm.member.departments.create(
    memberConnection,
    {
      body: {
        name: departmentName,
        description: departmentDescription,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 3. Validate response fields
  TestValidator.equals(
    "department name matches",
    department.name,
    departmentName,
  );
  TestValidator.equals(
    "description matches",
    department.description,
    departmentDescription,
  );
  TestValidator.equals("parent is null for top-level", department.parent, null);
  TestValidator.equals("deleted_at is null", department.deleted_at, null);
  // 4. Validate timestamps are set
  TestValidator.predicate(
    "created_at is set",
    department.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    department.updated_at.length > 0,
  );
  // 5. Validate organization is correctly associated
  TestValidator.predicate(
    "organization exists",
    department.organization !== null,
  );
  TestValidator.predicate(
    "organization has id",
    department.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization has name",
    department.organization.name.length > 0,
  );
}
