import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
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
import { generate_random_erp_hrm_member_contracts_create } from "../../../generate/generate_random_erp_hrm_member_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test partial update of an active contract by updating only specific fields while preserving others.
 *
 * **Test Steps:**
 * 1. Authenticate as a member with employee management permission
 * 2. Create an organization
 * 3. Create a role with employee management permissions
 * 4. Create an organization member
 * 5. Create an active employment contract with initial values: employment_type: 'full-time', pay_rate: 60000, pay_period: 'monthly', working_hours_per_week: 40, notes: 'Initial contract terms'
 * 6. Update only the pay_rate field to 65000 using PUT /erpHrm/member/contracts/{contractId} with request body containing only the pay_rate field
 * 7. Retrieve the updated contract and verify only pay_rate changed
 * 8. Update only the notes field to 'Salary adjustment effective immediately' and verify only notes changed
 * 9. Update only working_hours_per_week to 35 and employment_type to 'part-time' together
 *
 * **Validation Points:**
 * - Partial update with single field: verify only pay_rate changed from 60000 to 65000, all other fields remain unchanged
 * - Partial update with different field: verify only notes changed, pay_rate remains 65000
 * - Partial update with multiple fields: verify both working_hours_per_week and employment_type updated while pay_rate and notes remain unchanged
 * - Verify the contract maintains is_active=true throughout
 * - Verify updated_at timestamp refreshes on each update
 * - Verify immutable fields (id, start_date, end_date, organization_member_id, organization_id) never change
 *
 * **Business Logic Verification:**
 * - The update endpoint supports partial updates - unspecified fields retain their current values
 * - This allows targeted adjustments to employment terms without requiring full contract resubmission
 * - Common use case: mid-year salary adjustments, role changes affecting hours, or adding contract notes without affecting other terms
 */
export async function test_api_contract_update_partial_fields_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with employee management permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // 2. Create an organization
  const organization: IErpHrmOrganization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: typia.random<string>(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create a role with employee management permissions
  const role: IErpHrmRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: typia.random<string>(),
        permissions: [
          {
            permission: "employee:manage",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create an organization member
  const organizationMember: IErpHrmOrganizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 5. Create an active employment contract with initial values
  const initialContract: IErpHrmContract =
    await generate_random_erp_hrm_member_contracts_create(memberConnection, {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "full-time",
        pay_rate: 60000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: "Initial contract terms",
        start_date: new Date().toISOString(),
      } satisfies IErpHrmContract.ICreate,
    });
  typia.assert(initialContract);
  // 6. Update only the pay_rate field to 65000
  const updatedContract1: IErpHrmContract =
    await api.functional.erpHrm.member.contracts.update(memberConnection, {
      contractId: initialContract.id,
      body: {
        pay_rate: 65000,
      } satisfies IErpHrmContract.IUpdate,
    });
  typia.assert(updatedContract1);
  // 7. Verify only pay_rate changed from 60000 to 65000
  TestValidator.equals("pay_rate updated", updatedContract1.payRate, 65000);
  TestValidator.equals(
    "employment_type unchanged",
    updatedContract1.employmentType,
    "full-time",
  );
  TestValidator.equals(
    "pay_period unchanged",
    updatedContract1.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "working_hours_per_week unchanged",
    updatedContract1.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "notes unchanged",
    updatedContract1.notes,
    "Initial contract terms",
  );
  TestValidator.equals(
    "is_active remains true",
    updatedContract1.isActive,
    true,
  );
  TestValidator.equals("id unchanged", updatedContract1.id, initialContract.id);
  TestValidator.equals(
    "start_date unchanged",
    updatedContract1.startDate,
    initialContract.startDate,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedContract1.updatedAt > initialContract.updatedAt,
  );
  // 8. Update only the notes field
  const updatedContract2: IErpHrmContract =
    await api.functional.erpHrm.member.contracts.update(memberConnection, {
      contractId: initialContract.id,
      body: {
        notes: "Salary adjustment effective immediately",
      } satisfies IErpHrmContract.IUpdate,
    });
  typia.assert(updatedContract2);
  // Verify only notes changed
  TestValidator.equals("pay_rate unchanged", updatedContract2.payRate, 65000);
  TestValidator.equals(
    "notes updated",
    updatedContract2.notes,
    "Salary adjustment effective immediately",
  );
  TestValidator.equals(
    "employment_type unchanged",
    updatedContract2.employmentType,
    "full-time",
  );
  TestValidator.equals(
    "working_hours_per_week unchanged",
    updatedContract2.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "is_active remains true",
    updatedContract2.isActive,
    true,
  );
  // 9. Update working_hours_per_week and employment_type together
  const updatedContract3: IErpHrmContract =
    await api.functional.erpHrm.member.contracts.update(memberConnection, {
      contractId: initialContract.id,
      body: {
        employment_type: "part-time",
        working_hours_per_week: 35,
      } satisfies IErpHrmContract.IUpdate,
    });
  typia.assert(updatedContract3);
  // Verify both working_hours_per_week and employment_type updated while others remain unchanged
  TestValidator.equals(
    "employment_type updated",
    updatedContract3.employmentType,
    "part-time",
  );
  TestValidator.equals(
    "working_hours_per_week updated",
    updatedContract3.workingHoursPerWeek,
    35,
  );
  TestValidator.equals("pay_rate unchanged", updatedContract3.payRate, 65000);
  TestValidator.equals(
    "notes unchanged",
    updatedContract3.notes,
    "Salary adjustment effective immediately",
  );
  TestValidator.equals(
    "pay_period unchanged",
    updatedContract3.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "is_active remains true",
    updatedContract3.isActive,
    true,
  );
  TestValidator.predicate(
    "updated_at refreshed again",
    updatedContract3.updatedAt > updatedContract2.updatedAt,
  );
}
