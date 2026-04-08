import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLogAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLogAnalytic";
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
 * Test that a member without org:manage permission is denied access to activity log analytics.
 *
 * Validates that when a member with only basic employee permissions attempts to access the activity log analytics endpoint, the system returns a 403 Forbidden response. This confirms the permission-based access control enforcement for activity log analytics, ensuring that only users with organization management capabilities can view aggregated activity statistics.
 *
 * The test verifies that the authorization middleware correctly checks for org:manage permission before allowing access to this sensitive analytics data. A newly registered member should not have org:manage permission by default, making them ineligible to access organization-wide activity analytics.
 *
 * 1. Register a new member account using authorize_member_join utility.
 * 2. Create a member-specific connection with the authentication token.
 * 3. Attempt to access the activity log analytics endpoint with a random organization ID.
 * 4. Verify that the system returns a 403 Forbidden response due to missing org:manage permission.
 */
export async function test_api_activity_log_analytics_permission_denied_without_manage(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Attempt to access activity log analytics endpoint without org:manage permission
  // A newly registered member should not have org:manage permission by default
  await TestValidator.httpError(
    "member without org:manage permission should be denied access to activity log analytics",
    403,
    async () => {
      await api.functional.hrm.member.organizations.activity_logs.analytics(
        memberConnection,
        {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
