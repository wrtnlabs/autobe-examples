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

/**
 * Test successful retrieval of a top-level department by its unique identifier.
 * This scenario validates that a member can access complete department details including name, description, timestamps, and organization context.
 * The test creates a member, organization, and top-level department, then retrieves the department to verify all IErpHrmDepartment fields.
 */
export async function test_api_department_retrieve_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      firstName: "Test",
      lastName: "Member",
    },
  });
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Test Organization",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create top-level department (no parent)
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: "Engineering Department",
        description: "Main engineering department",
        parentDepartmentId: null, // Top-level department
      },
    },
  );
  typia.assert(department);
  // 4. Retrieve the department by ID
  const retrieved = await api.functional.erpHrm.member.departments.at(
    memberConnection,
    {
      departmentId: department.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate top-level department properties
  typia.assert(retrieved.parentDepartment === null);
  typia.assert(Array.isArray(retrieved.children));
  typia.assert(retrieved.id === department.id);
  typia.assert(retrieved.name === department.name);
}
