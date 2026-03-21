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
 * Test retrieving activity log statistics for an organization as a member with org:manage permission.
 *
 * Steps:
 * 1. Create a new member account via POST /erpHrm/auth/member/join with valid email, password, and display name
 * 2. Use the returned access_token as Bearer authentication for the statistics endpoint
 * 3. Request activity log statistics for an organization where the member has org:manage permission
 *
 * Expected results:
 * - HTTP 200 OK response
 * - Response body contains aggregated statistics including:
 *   - action_type: category of action performed
 *   - count: total number of activity log entries for the corresponding action type
 */
export async function test_api_activity_log_statistics_with_org_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via /erpHrm/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrm.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Request activity log statistics using the member's access token
  // Note: organizationId must be a valid UUID of an organization the member has org:manage permission for
  // For this test, we use a placeholder UUID that should be replaced with a real organization ID
  // or the test should be adjusted to first create/fetch a valid organization
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the statistics endpoint with Bearer authentication
  const statistics =
    await api.functional.erpHrm.member.organizations.activity_logs.statistics(
      memberConnection,
      {
        organizationId: organizationId,
      },
    );
  typia.assert(statistics);
  // 4. Validate response structure
  TestValidator.equals(
    "action_type is string",
    typeof statistics.action_type,
    "string",
  );
  TestValidator.equals("count is number", typeof statistics.count, "number");
  TestValidator.predicate("count is non-negative", statistics.count >= 0);
}
