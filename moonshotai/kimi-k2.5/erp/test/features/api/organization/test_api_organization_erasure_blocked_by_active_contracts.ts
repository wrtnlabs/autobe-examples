import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_erasure_blocked_by_active_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      } satisfies IErpHrmOrganization.ICreate,
    });
  typia.assert(organization);
  TestValidator.equals(
    "organization initially active",
    organization.deleted_at,
    null,
  );
  // 3. Create employee user
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employee);
  // 4. Create organization member (employee)
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          employmentType: "full_time",
          isActive: true,
        } as DeepPartial<IErpHrmOrganizationMember.ICreate>,
      },
    );
  typia.assert(organizationMember);
  // 5. Create active employment contract (no end_date means isActive=true)
  const contract = await generate_random_erp_hrm_member_contracts_create(
    ownerConnection,
    {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "full-time",
        start_date: new Date(Date.now() - 86400000).toISOString(),
        pay_rate: 5000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } as DeepPartial<IErpHrmContract.ICreate>,
    },
  );
  typia.assert(contract);
  TestValidator.predicate("contract is active", contract.isActive === true);
  // 6. Attempt to delete organization - should be blocked by active contracts
  await TestValidator.error(
    "organization deletion blocked by active contracts",
    async () => {
      await api.functional.erpHrm.member.organizations.erase(ownerConnection, {
        organizationId: organization.id,
      });
    },
  );
  // 7. Verify organization still active by creating another member
  const anotherEmployeeConnection: api.IConnection = { host: connection.host };
  const anotherEmployee = await authorize_member_join(
    anotherEmployeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        firstName: RandomGenerator.name(1),
        lastName: RandomGenerator.name(1),
        avatarUrl: null,
        timezone: null,
        locale: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(anotherEmployee);
  const anotherMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: anotherEmployee.id,
          employmentType: "part_time",
          isActive: true,
        } as DeepPartial<IErpHrmOrganizationMember.ICreate>,
      },
    );
  typia.assert(anotherMember);
}
