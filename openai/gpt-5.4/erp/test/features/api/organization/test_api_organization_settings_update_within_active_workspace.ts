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

export async function test_api_organization_settings_update_within_active_workspace(
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
  const activeOrganization: IHrmTimeTrackingOrganization.ISummary =
    authorized.role.organization;
  const firstFiscalStartMonth = 3 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<12>;
  const secondFiscalStartMonth = 10 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<12>;
  const firstBody = {
    name: `workspace-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: firstFiscalStartMonth,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const firstUpdated: IHrmTimeTrackingOrganization =
    await api.functional.hrmTimeTracking.employee.organizations.update(
      employeeConnection,
      {
        organizationId: activeOrganization.id,
        body: firstBody,
      },
    );
  typia.assert(firstUpdated);
  TestValidator.equals(
    "updated organization id matches active organization",
    firstUpdated.id,
    activeOrganization.id,
  );
  TestValidator.equals(
    "updated organization name matches request",
    firstUpdated.name,
    firstBody.name,
  );
  TestValidator.equals(
    "updated organization description matches request",
    firstUpdated.description,
    firstBody.description,
  );
  TestValidator.equals(
    "updated organization logo uri matches request",
    firstUpdated.logo_uri,
    firstBody.logo_uri,
  );
  TestValidator.equals(
    "updated organization currency code matches request",
    firstUpdated.currency_code,
    firstBody.currency_code,
  );
  TestValidator.equals(
    "updated organization timezone matches request",
    firstUpdated.timezone,
    firstBody.timezone,
  );
  TestValidator.equals(
    "updated organization fiscal start month matches request",
    firstUpdated.fiscal_start_month,
    firstBody.fiscal_start_month,
  );
  TestValidator.equals(
    "organization created_at is preserved from active workspace summary",
    firstUpdated.created_at,
    activeOrganization.created_at,
  );
  TestValidator.notEquals(
    "organization updated_at changes after first update",
    firstUpdated.updated_at,
    activeOrganization.updated_at,
  );
  TestValidator.equals(
    "organization remains active after first update",
    firstUpdated.deleted_at,
    null,
  );
  const secondBody = {
    name: `workspace-${RandomGenerator.alphabets(10)}`,
    description: null,
    logo_uri: null,
    currency_code: "KRW",
    timezone: "UTC",
    fiscal_start_month: secondFiscalStartMonth,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const secondUpdated: IHrmTimeTrackingOrganization =
    await api.functional.hrmTimeTracking.employee.organizations.update(
      employeeConnection,
      {
        organizationId: activeOrganization.id,
        body: secondBody,
      },
    );
  typia.assert(secondUpdated);
  TestValidator.equals(
    "second update keeps same organization id",
    secondUpdated.id,
    activeOrganization.id,
  );
  TestValidator.equals(
    "second update preserves created_at",
    secondUpdated.created_at,
    firstUpdated.created_at,
  );
  TestValidator.notEquals(
    "second update changes updated_at",
    secondUpdated.updated_at,
    firstUpdated.updated_at,
  );
  TestValidator.equals(
    "second update applies new name",
    secondUpdated.name,
    secondBody.name,
  );
  TestValidator.equals(
    "second update clears description",
    secondUpdated.description,
    null,
  );
  TestValidator.equals(
    "second update clears logo uri",
    secondUpdated.logo_uri,
    null,
  );
  TestValidator.equals(
    "second update applies new currency code",
    secondUpdated.currency_code,
    secondBody.currency_code,
  );
  TestValidator.equals(
    "second update applies new timezone",
    secondUpdated.timezone,
    secondBody.timezone,
  );
  TestValidator.equals(
    "second update applies new fiscal start month",
    secondUpdated.fiscal_start_month,
    secondBody.fiscal_start_month,
  );
  TestValidator.equals(
    "organization remains active after second update",
    secondUpdated.deleted_at,
    null,
  );
}
