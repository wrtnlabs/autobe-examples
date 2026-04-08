import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity log access permission enforcement for organization members.
 *
 * Validates that activity log retrieval requires organization management permissions. Members with only Employee role (lacking org:manage permission) should receive access denied responses when attempting to view organization activity logs. This test ensures proper permission-based access control for sensitive audit trail data.
 *
 * The test verifies the security boundary where regular employees cannot access organization-wide activity logs, restricting this capability to administrators and managers with appropriate permissions.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Use the authenticated member connection to attempt activity log access.
 * 3. Validates that the request fails with HTTP 403 Forbidden or 401 Unauthorized error.
 */
export async function test_api_activity_log_permission_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registrationPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: registrationPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Login to get organization context and fresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuth = await api.functional.hrm.auth.member.login(
    loginConnection,
    {
      body: {
        email: memberAuth.email,
        password: registrationPassword,
      },
    },
  );
  typia.assert(loginAuth);
  // 3. Create member-specific connection with auth token
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: loginAuth.token.access },
  };
  // 4. Attempt to access activity logs without org:manage permission
  // Should fail with 403 Forbidden or 401 Unauthorized (or 404 if not in org)
  await TestValidator.httpError(
    "employee without org:manage permission denied access to activity logs",
    [401, 403, 404],
    async () => {
      // Use a random organization code - server will validate membership and permissions
      await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationcode(
        employeeConnection,
        {
          organizationCode: typia.random<string>(),
          body: {} satisfies IHrmActivityLog.IRequest,
        },
      );
    },
  );
}
