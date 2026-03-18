import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";

export async function test_api_organization_settings_update_denied_without_owner_authority(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const organizationId = authorized.role.organization.id;
  const updateBody = {
    name: `Org ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  await TestValidator.httpError(
    "organization settings update denied without owner authority",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.employee.organizations.update(
        employeeConnection,
        {
          organizationId,
          body: updateBody,
        },
      );
    },
  );
}
