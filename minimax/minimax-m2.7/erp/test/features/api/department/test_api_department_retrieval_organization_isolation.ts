import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_department_retrieval_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    displayName: RandomGenerator.name(),
    href: "https://example.com/admin",
    referrer: "https://example.com",
  };
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  await authorize_admin_login(adminConnection, { body: adminCredentials });
  // 2. Create Organization A
  const organizationA =
    await generate_random_erp_hrm_admin_organizations_create(adminConnection, {
      body: {
        name: `Org A - ${RandomGenerator.alphaNumeric(8)}`,
        currency: "USD",
        timezone: "America/New_York",
        fiscalStartMonth: 1,
      },
    });
  typia.assert(organizationA);
  // 3. Create a department in Organization A
  const departmentA = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: `Dept in A - ${RandomGenerator.alphaNumeric(6)}`,
        description: "Test department for org isolation",
      },
    },
  );
  typia.assert(departmentA);
  // 4. Create Organization B
  const organizationB =
    await generate_random_erp_hrm_admin_organizations_create(adminConnection, {
      body: {
        name: `Org B - ${RandomGenerator.alphaNumeric(8)}`,
        currency: "EUR",
        timezone: "Europe/London",
        fiscalStartMonth: 4,
      },
    });
  typia.assert(organizationB);
  // 5. Switch organization context to Organization B
  await generate_random_erp_hrm_member_organization_context_select(
    adminConnection,
    {
      body: {
        organizationId: organizationB.id,
      },
    },
  );
  // 6. Attempt to retrieve department from Organization A while in Organization B context
  // This should return 404 error due to organization-level data isolation
  await TestValidator.httpError(
    "cross-organization department access denied",
    404,
    async () => {
      await api.functional.erpHrm.member.departments.at(adminConnection, {
        departmentId: departmentA.id,
      });
    },
  );
}
