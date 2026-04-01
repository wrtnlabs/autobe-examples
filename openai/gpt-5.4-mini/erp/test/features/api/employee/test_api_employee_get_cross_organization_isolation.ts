import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_get_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const organizationAConnection: api.IConnection = { host: connection.host };
  const organizationBConnection: api.IConnection = { host: connection.host };
  const organizationAEmail = `org-a-${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  const organizationBEmail = `org-b-${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  const password = "1234";
  await authorize_member_join(organizationAConnection, {
    body: {
      email: organizationAEmail,
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await authorize_member_join(organizationBConnection, {
    body: {
      email: organizationBEmail,
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const foreignEmployeeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "employee retrieval should not leak cross-organization records",
    404,
    async () => {
      await api.functional.erpHrmTime.member.employees.at(
        organizationAConnection,
        {
          employeeId: foreignEmployeeId,
        },
      );
    },
  );
}
