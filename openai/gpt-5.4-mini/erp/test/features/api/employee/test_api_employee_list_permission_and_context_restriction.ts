import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_list_permission_and_context_restriction(
  connection: api.IConnection,
): Promise<void> {
  const noContextConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(noContextConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  await TestValidator.error(
    "employee list should reject authenticated member without selected organization context",
    async () => {
      await api.functional.erpHrmTime.member.employees.index(
        noContextConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "employee list should reject empty organization context browsing",
    async () => {
      const isolatedConnection: api.IConnection = { host: connection.host };
      await api.functional.erpHrmTime.member.employees.index(
        isolatedConnection,
        {
          body: {
            search: RandomGenerator.name(),
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
        },
      );
    },
  );
}
