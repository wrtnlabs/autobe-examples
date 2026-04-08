import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";

export async function test_api_department_delete_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const password = `${RandomGenerator.alphaNumeric(12)}!Aa1`;
  const displayName = RandomGenerator.name();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const scopedConnection: api.IConnection = { host: connection.host };
  scopedConnection.headers = {
    ...(memberConnection.headers ?? {}),
  };
  const organizationPage =
    await api.functional.erpHrmTime.member.organizations.index(
      scopedConnection,
      { body: {} },
    );
  typia.assert(organizationPage);
  TestValidator.predicate(
    "member should have at least one accessible organization",
    organizationPage.data.length > 0,
  );
  const targetDepartment =
    await api.functional.erpHrmTime.member.departments.create(
      scopedConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(targetDepartment);
  const anotherConnection: api.IConnection = { host: connection.host };
  anotherConnection.headers = {
    ...(memberConnection.headers ?? {}),
  };
  const anotherDepartment =
    await api.functional.erpHrmTime.member.departments.create(
      anotherConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(anotherDepartment);
  TestValidator.notEquals(
    "departments created in the two contexts should not share the same id",
    targetDepartment.id,
    anotherDepartment.id,
  );
  await TestValidator.error(
    "deleting a department from a mismatched organization context must fail",
    async () => {
      await api.functional.erpHrmTime.member.departments.erase(
        scopedConnection,
        {
          departmentId: anotherDepartment.id,
        },
      );
    },
  );
  const reloadedOrganizations =
    await api.functional.erpHrmTime.member.organizations.index(
      scopedConnection,
      { body: {} },
    );
  typia.assert(reloadedOrganizations);
  TestValidator.predicate(
    "organization scoping remains intact after rejected deletion",
    reloadedOrganizations.data.length > 0,
  );
}
