import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_detail_top_level(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and obtain JWT credentials
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (member becomes Owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a top-level department (no parentId)
  const departmentName = "Engineering";
  const departmentDescription = "The engineering department";
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: departmentName,
          description: departmentDescription,
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(department);
  // Test execution: Retrieve the department detail
  const retrieved =
    await api.functional.erpHrm.member.organizations.departments.at(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: department.id,
      },
    );
  typia.assert(retrieved);
  // Validation: id matches
  TestValidator.equals("department id matches", retrieved.id, department.id);
  // Validation: name matches
  TestValidator.equals(
    "department name matches",
    retrieved.name,
    departmentName,
  );
  // Validation: parent is null (top-level department)
  TestValidator.equals("department parent is null", retrieved.parent, null);
  // Validation: children array is empty
  TestValidator.equals(
    "department children count",
    retrieved.children.length,
    0,
  );
  // Validation: organization id matches
  TestValidator.equals(
    "organization id matches",
    retrieved.organization.id,
    organization.id,
  );
  // Validation: deleted_at is null (active department)
  TestValidator.equals("department is active", retrieved.deleted_at, null);
}
