import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { generate_random_erp_hrm_time_member_roles_create } from "../../../generate/generate_random_erp_hrm_time_member_roles_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";
import { prepare_random_erp_hrm_time_role } from "../../../prepare/prepare_random_erp_hrm_time_role";

export async function test_api_employee_update_with_cross_organization_references(
  connection: api.IConnection,
): Promise<void> {
  const activeConnection: api.IConnection = { host: connection.host };
  const otherConnection: api.IConnection = { host: connection.host };
  const activeMember = await authorize_member_join(activeConnection, {
    body: {
      email:
        `active-${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: `Pw-${RandomGenerator.alphaNumeric(12)}` satisfies string &
        tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: `https://example.com/onboarding/${RandomGenerator.alphaNumeric(6)}` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://example.com/ref/${RandomGenerator.alphaNumeric(6)}` satisfies string &
          tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(activeMember);
  const otherMember = await authorize_member_join(otherConnection, {
    body: {
      email:
        `other-${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: `Pw-${RandomGenerator.alphaNumeric(12)}` satisfies string &
        tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: `https://example.com/onboarding/${RandomGenerator.alphaNumeric(6)}` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://example.com/ref/${RandomGenerator.alphaNumeric(6)}` satisfies string &
          tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherMember);
  const activeDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      activeConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(activeDepartment);
  const otherDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      otherConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(otherDepartment);
  const activeRole = await generate_random_erp_hrm_time_member_roles_create(
    activeConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:manage",
            description: "manage employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      },
    },
  );
  typia.assert(activeRole);
  const otherRole = await generate_random_erp_hrm_time_member_roles_create(
    otherConnection,
    {
      body: {
        name: `role-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          {
            id: typia.random<string & tags.Format<"uuid">>(),
            key: "employee:manage",
            description: "manage employees",
          } satisfies IErpHrmTimePermission.ISummary,
        ],
      },
    },
  );
  typia.assert(otherRole);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reject cross-organization department reference",
    async () => {
      await api.functional.erpHrmTime.member.employees.update(
        activeConnection,
        {
          employeeId,
          body: {
            erp_hrm_time_department_id: otherDepartment.id,
          } satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "reject cross-organization role reference",
    async () => {
      await api.functional.erpHrmTime.member.employees.update(
        activeConnection,
        {
          employeeId,
          body: {
            erp_hrm_time_role_id: otherRole.id,
          } satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "reject mixed invalid organization references",
    async () => {
      await api.functional.erpHrmTime.member.employees.update(
        activeConnection,
        {
          employeeId,
          body: {
            erp_hrm_time_department_id: otherDepartment.id,
            erp_hrm_time_role_id: otherRole.id,
            position_title: RandomGenerator.name(),
            employment_type: "full-time",
            status: "active",
          } satisfies IErpHrmTimeEmployeeDashboardSummary.IUpdate,
        },
      );
    },
  );
}
