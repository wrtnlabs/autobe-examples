import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_retrieval_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user for organization and department management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Admin creates organization (establishes org context for admin)
  const organization = await api.functional.erpHrm.admin.organizations.create(
    adminConnection,
    {
      body: {
        currency: "USD",
        description: "Test organization for department retrieval",
        fiscalStartMonth: 1,
        name: `Test Org ${RandomGenerator.alphabets(8)}`,
        timezone: "Asia/Seoul",
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // 4. Admin creates a top-level department (no parent)
  const department = await api.functional.erpHrm.admin.departments.create(
    adminConnection,
    {
      body: {
        description: "Test top-level department",
        name: `Test Department ${RandomGenerator.alphabets(6)}`,
        parentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 5. Retrieve the top-level department by ID
  // Using adminConnection since admin has org context as owner
  const retrievedDepartment = await api.functional.erpHrm.member.departments.at(
    adminConnection,
    {
      departmentId: department.id,
    },
  );
  typia.assert(retrievedDepartment);
  // 6. Validate all department fields
  TestValidator.equals(
    "department id matches",
    retrievedDepartment.id,
    department.id,
  );
  TestValidator.equals(
    "name matches",
    retrievedDepartment.name,
    department.name,
  );
  TestValidator.equals(
    "description matches",
    retrievedDepartment.description,
    department.description,
  );
  TestValidator.equals(
    "parent is null for top-level",
    retrievedDepartment.parent,
    null,
  );
  TestValidator.equals(
    "has organization context",
    retrievedDepartment.organization !== null,
    true,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedDepartment.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "has valid created_at",
    retrievedDepartment.created_at !== null &&
      retrievedDepartment.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at",
    retrievedDepartment.updated_at !== null &&
      retrievedDepartment.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedDepartment.deleted_at,
    null,
  );
}
