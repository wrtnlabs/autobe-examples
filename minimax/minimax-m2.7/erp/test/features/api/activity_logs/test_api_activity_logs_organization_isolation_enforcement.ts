import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test organization isolation enforcement by verifying that an admin cannot access
 * activity logs from an organization they do not have org:manage permission for.
 * When an admin attempts to retrieve activity logs for a different organization
 * (using a random organizationId they don't have access to), the system shall
 * deny the request and return an access denied error (HTTP 403).
 * This validates that activity logs are strictly scoped to their organization
 * and cannot be accessed cross-organization.
 */
export async function test_api_activity_logs_organization_isolation_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // Attempt to access activity logs for a random organizationId (not the admin's own)
  // The admin has no org:manage permission for this organization, so should be denied
  const unauthorizedOrgId = typia.random<string & tags.Format<"uuid">>();
  // Validate that access is denied with HTTP 403
  await TestValidator.httpError(
    "Admin cannot access activity logs from unauthorized organization",
    403,
    async () =>
      await api.functional.erpHrm.admin.organizations.activity_logs.index(
        adminConnection,
        {
          organizationId: unauthorizedOrgId,
          body: {} satisfies IErpHrmActivityLog.IRequest,
        },
      ),
  );
}
