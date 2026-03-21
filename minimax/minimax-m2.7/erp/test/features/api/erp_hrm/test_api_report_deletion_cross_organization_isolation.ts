import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_deletion_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first admin (Organization A)
  const adminACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IErpHrmAdmin.IJoin;
  const adminAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAConnection, { body: adminACredentials });
  // Step 2: Create second admin (Organization B)
  const adminBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IErpHrmAdmin.IJoin;
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminBConnection, { body: adminBCredentials });
  // Step 3: Admin B attempts to delete a report from Admin A's organization
  // Generate UUIDs for organization and report
  const targetOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const targetReportId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Validate access denied error - Admin B cannot delete reports from Org A
  await TestValidator.httpError(
    "admin from different organization cannot delete report",
    403,
    async () =>
      await api.functional.erpHrm.admin.organizations.reports.erase(
        adminBConnection,
        {
          organizationId: targetOrganizationId,
          reportId: targetReportId,
        },
      ),
  );
}
