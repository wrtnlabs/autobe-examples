import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member without org:manage permission receives an access denied error
 * when attempting to view activity log statistics.
 *
 * Steps:
 * 1. Create a new member account via /auth/member/join
 * 2. Use the returned access_token as Bearer authentication
 * 3. Attempt to request activity log statistics for an organization where the member
 *    does NOT have org:manage permission
 *
 * Expected results:
 * - HTTP 403 Forbidden response
 * - Error response indicating insufficient permissions
 *
 * This validates the authorization boundary ensuring only users with org:manage
 * permission can view organizational activity statistics, protecting sensitive
 * audit trail data from unauthorized access.
 */
export async function test_api_activity_log_statistics_without_org_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account using the authorize utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // Step 2: Create a new connection with the authenticated token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorizedMember.token.access}`,
    },
  };
  // Step 3: Generate a random organization UUID that the member is NOT part of
  // The member has no permissions on this organization
  const unauthorizedOrgId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Attempt to access activity log statistics without org:manage permission
  // Expected: 403 Forbidden error
  await TestValidator.httpError(
    "member without org:manage permission should receive 403 Forbidden",
    403,
    async () =>
      await api.functional.erpHrm.member.organizations.activity_logs.statistics(
        authenticatedConnection,
        {
          organizationId: unauthorizedOrgId,
        },
      ),
  );
}
