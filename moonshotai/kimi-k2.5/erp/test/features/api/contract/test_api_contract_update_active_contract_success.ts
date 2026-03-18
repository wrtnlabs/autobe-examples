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
 * Test successful update of an active employment contract's terms and conditions.
 *
 * This test validates that an active contract can be updated with new terms
 * while preserving immutable fields and system-managed properties.
 */
export async function test_api_contract_update_active_contract_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member with employee management permission
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      firstName: "Owner",
      lastName: "Test",
    },
  });
  typia.assert(owner);
  // 2. Create organization as the authenticated member (becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: "Test Organization",
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      },
    });
  typia.assert(organization);
  // 3. Create a custom role with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "HR Manager",
        permissions: [
          { permission: "employee:manage" },
          { permission: "employee:view" },
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Create a second member who will be the employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      firstName: "Employee",
      lastName: "Test",
    },
  });
  typia.assert(employee);
  // 5. Create organization member assigned to that role
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
          position: "Software Engineer",
        },
      },
    );
  typia.assert(organizationMember);
  // 6. Create an active employment contract with specific initial terms
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Start 30 days ago
  const originalContract =
    await generate_random_erp_hrm_member_contracts_create(ownerConnection, {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "full-time",
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        start_date: startDate.toISOString(),
        end_date: null,
        notes: null,
      },
    });
  typia.assert(originalContract);
  // Store original values for comparison
  const originalId = originalContract.id;
  const originalStartDate = originalContract.startDate;
  const originalCreatedAt = originalContract.createdAt;
  const originalOrgMemberId = originalContract.organizationMember.id;
  // 7. Update the active contract with new terms
  const updateBody = {
    employment_type: "part-time",
    pay_rate: 25,
    pay_period: "hourly",
    working_hours_per_week: 20,
    notes: "Transitioned to part-time status",
  } satisfies IErpHrmContract.IUpdate;
  const updatedContract = await api.functional.erpHrm.member.contracts.update(
    ownerConnection,
    {
      contractId: originalContract.id,
      body: updateBody,
    },
  );
  typia.assert(updatedContract);
  // Validation Points
  // Verify contract ID remains unchanged
  TestValidator.equals("contract ID unchanged", updatedContract.id, originalId);
  // Verify employment_type changed from 'full-time' to 'part-time'
  TestValidator.equals(
    "employment_type changed to part-time",
    updatedContract.employmentType,
    "part-time",
  );
  TestValidator.notEquals(
    "employment_type is different from original",
    updatedContract.employmentType,
    originalContract.employmentType,
  );
  // Verify pay_rate changed from 50000 to 25
  TestValidator.equals("pay_rate changed to 25", updatedContract.payRate, 25);
  TestValidator.notEquals(
    "pay_rate is different from original",
    updatedContract.payRate,
    originalContract.payRate,
  );
  // Verify pay_period changed from 'monthly' to 'hourly'
  TestValidator.equals(
    "pay_period changed to hourly",
    updatedContract.payPeriod,
    "hourly",
  );
  TestValidator.notEquals(
    "pay_period is different from original",
    updatedContract.payPeriod,
    originalContract.payPeriod,
  );
  // Verify working_hours_per_week changed from 40 to 20
  TestValidator.equals(
    "working_hours_per_week changed to 20",
    updatedContract.workingHoursPerWeek,
    20,
  );
  TestValidator.notEquals(
    "working_hours_per_week is different from original",
    updatedContract.workingHoursPerWeek,
    originalContract.workingHoursPerWeek,
  );
  // Verify notes field now contains 'Transitioned to part-time status'
  TestValidator.equals(
    "notes updated correctly",
    updatedContract.notes,
    "Transitioned to part-time status",
  );
  // Verify start_date remains unchanged (immutable field)
  TestValidator.equals(
    "start_date unchanged",
    updatedContract.startDate,
    originalStartDate,
  );
  // Verify end_date remains null (contract still active)
  TestValidator.equals("end_date remains null", updatedContract.endDate, null);
  // Verify is_active remains true
  TestValidator.equals(
    "is_active remains true",
    updatedContract.isActive,
    true,
  );
  // Verify updated_at timestamp is more recent than created_at
  const updatedAtTime = new Date(updatedContract.updatedAt).getTime();
  const createdAtTime = new Date(originalCreatedAt).getTime();
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    updatedAtTime > createdAtTime,
  );
  // Verify the organizationMember relation is unchanged
  TestValidator.equals(
    "organizationMember ID unchanged",
    updatedContract.organizationMember.id,
    originalOrgMemberId,
  );
}
