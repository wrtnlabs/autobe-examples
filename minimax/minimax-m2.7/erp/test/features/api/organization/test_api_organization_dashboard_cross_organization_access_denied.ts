import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an admin cannot access the dashboard of an organization they do not belong to.
 *
 * This test validates organization data isolation at the service layer:
 * 1. Create first admin account via POST /erpHrm/auth/admin/join (Organization A)
 * 2. Create second admin account via POST /erpHrm/auth/admin/join (Organization B)
 * 3. Attempt to retrieve dashboard for Organization B using Organization A's admin tokens
 * 4. Verify the request is rejected with 403 Forbidden
 * 5. Confirm data isolation is enforced - admins can only view dashboards for organizations they belong to
 * 6. Also verify reverse cross-organization access is denied
 * 7. Validate cross-organization access is blocked at the service layer level
 */
export async function test_api_organization_dashboard_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first admin account for Organization A
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await api.functional.erpHrm.auth.admin.join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(adminA);
  // Step 2: Create second admin account for Organization B
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await api.functional.erpHrm.auth.admin.join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass456!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(adminB);
  // Step 3: Admin A attempts to access Admin B's organization dashboard
  // Step 4: Verify the request is rejected with 403 Forbidden
  await TestValidator.httpError(
    "cross-organization dashboard access denied",
    [403],
    async () =>
      await api.functional.erpHrm.admin.organizations.dashboard.at(
        adminAConnection,
        {
          organizationId: adminB.id,
        },
      ),
  );
  // Step 5: Verify reverse cross-organization access is also denied
  // Admin B cannot access Admin A's organization dashboard
  await TestValidator.httpError(
    "reverse cross-organization dashboard access denied",
    [403],
    async () =>
      await api.functional.erpHrm.admin.organizations.dashboard.at(
        adminBConnection,
        {
          organizationId: adminA.id,
        },
      ),
  );
  // Step 6: Validate that the service layer properly enforces organization context isolation
  // Both admins should receive 403 when attempting to access other organizations' dashboards
  // This confirms data isolation is enforced at the service layer level
}
