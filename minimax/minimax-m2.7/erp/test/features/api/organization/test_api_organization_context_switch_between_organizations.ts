import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_organization_context_switch_between_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member who will belong to both organizations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Admin creates two organizations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const orgA = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: `Org A ${RandomGenerator.alphaNumeric(8)}`,
        currency: "USD",
        timezone: "America/New_York",
        fiscalStartMonth: 1,
      },
    },
  );
  typia.assert(orgA);
  const orgB = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: `Org B ${RandomGenerator.alphaNumeric(8)}`,
        currency: "EUR",
        timezone: "Europe/London",
        fiscalStartMonth: 4,
      },
    },
  );
  typia.assert(orgB);
  // 3. Admin adds member as employee in Org A
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: memberEmail,
      roleId: orgA.owner.id,
      employmentType: "full-time",
    },
  });
  // 4. Admin adds member as employee in Org B
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: memberEmail,
      roleId: orgB.owner.id,
      employmentType: "full-time",
    },
  });
  // 5. Member logs in
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // 6. Switch to Org A context
  const contextA =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: {
          organizationId: orgA.id,
        },
      },
    );
  typia.assert(contextA);
  // Verify Org A context
  TestValidator.equals(
    "organization id matches Org A",
    contextA.organization.id,
    orgA.id,
  );
  TestValidator.predicate(
    "has organization name",
    contextA.organization.name.length > 0,
  );
  TestValidator.predicate(
    "has permissions array",
    Array.isArray(contextA.permissions),
  );
  TestValidator.predicate(
    "has employee record",
    contextA.employee !== undefined,
  );
  // 7. Switch to Org B context
  const contextB =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: {
          organizationId: orgB.id,
        },
      },
    );
  typia.assert(contextB);
  // Verify Org B context
  TestValidator.equals(
    "organization id matches Org B",
    contextB.organization.id,
    orgB.id,
  );
  TestValidator.predicate(
    "has organization name",
    contextB.organization.name.length > 0,
  );
  TestValidator.predicate(
    "has permissions array",
    Array.isArray(contextB.permissions),
  );
  TestValidator.predicate(
    "has employee record",
    contextB.employee !== undefined,
  );
  // 8. Verify contexts are different organizations
  TestValidator.notEquals(
    "organization contexts are different",
    contextA.organization.id,
    contextB.organization.id,
  );
  TestValidator.equals(
    "Org A currency is USD",
    contextA.organization.currency,
    "USD",
  );
  TestValidator.equals(
    "Org B currency is EUR",
    contextB.organization.currency,
    "EUR",
  );
}
