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

export async function test_api_department_deletion_empty_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system with known password
  const password = RandomGenerator.alphaNumeric(16) + "!1Aa";
  const adminCredentials = await authorize_admin_join(connection, {
    body: {
      password: password,
    },
  });
  // 2. Admin logs in to get fresh session
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminCredentials.email,
      password: password,
      href: "https://example.com/admin",
      referrer: "https://example.com/",
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 3. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminLoginConnection,
    {},
  );
  typia.assert(organization);
  // 4. Set organization context
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminLoginConnection,
      {
        body: {
          organizationId: organization.id,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(orgContext);
  // 5. Create empty department (no employees, no children)
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminLoginConnection,
    {
      body: {
        name: `Empty Department ${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 6. Delete the empty department - should return 204 No Content
  await api.functional.erpHrm.admin.departments.erase(adminLoginConnection, {
    departmentId: department.id,
  });
}
