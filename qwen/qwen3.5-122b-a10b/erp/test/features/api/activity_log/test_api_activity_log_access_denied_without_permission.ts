import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member without org:manage permission is denied access to activity logs.
 *
 * Validates the permission-based access control enforcement for activity log retrieval.
 * This test ensures that only users with org:manage permission can view audit trails,
 * while regular members (e.g., Employees) are properly denied access with a 403 Forbidden response.
 *
 * The test follows this workflow:
 * 1. Register a new member account without org:manage permission (Employee role)
 * 2. Generate a random activity log UUID and organization code for testing
 * 3. Attempt to retrieve the activity log using the unauthorized member's connection
 * 4. Verify the API returns 403 Forbidden status code
 * 5. Confirm the error response indicates insufficient permissions
 *
 * This validates that the backend properly enforces permission checks on the
 * /hrm/member/organizations/{organizationCode}/activity-logs/{activityLogId} endpoint,
 * preventing unauthorized users from accessing sensitive audit trail information.
 */
export async function test_api_activity_log_access_denied_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member without org:manage permission (Employee role)
  const memberConnection: IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Generate test identifiers for activity log access attempt
  const organizationCode: string = RandomGenerator.alphabets(8);
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve activity log without org:manage permission
  // Expected: 403 Forbidden error due to insufficient permissions
  await TestValidator.httpError(
    "member without org:manage permission should be denied access to activity logs",
    403,
    async () => {
      await api.functional.hrm.member.organizations.activity_logs.at(
        memberConnection,
        {
          organizationCode,
          activityLogId,
        },
      );
    },
  );
}
