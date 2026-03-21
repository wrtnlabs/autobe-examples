import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that accessing activity log statistics without proper authorization is denied for members.
 *
 * This test validates the access control for admin-only activity log statistics endpoint:
 * 1. Register and authenticate as a member (non-admin user)
 * 2. Attempt to access GET /erpHrm/admin/organizations/{organizationId}/activity-logs/statistics
 * 3. Verify that the request is rejected with 403 Forbidden
 * 4. Confirm the error indicates insufficient permissions
 * 5. Verify no statistics data is exposed to unauthorized users
 */
export async function test_api_activity_log_statistics_access_denied_for_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as a regular member (non-admin)
  const memberConnection: api.IConnection = { host: connection.host };
  const randomStr = String(randint(100000, 999999));
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: `member_${randomStr}@test.com` as string & tags.Format<"email">,
      password: "TestPassword123!" as string & tags.Format<"password">,
      displayName: `Test Member ${randomStr}`,
    },
  });
  typia.assert(memberAuth);
  // Step 2: Attempt to access activity log statistics as member
  // This endpoint requires admin authorization, so member access should be denied
  // Using a sample organization ID format - the authorization check happens before org validation
  const sampleOrganizationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify the access is denied with 403 Forbidden
  await TestValidator.httpError(
    "member should be denied access to activity log statistics",
    403,
    async () =>
      await api.functional.erpHrm.admin.organizations.activity_logs.statistics(
        memberConnection,
        {
          organizationId: sampleOrganizationId,
        },
      ),
  );
}