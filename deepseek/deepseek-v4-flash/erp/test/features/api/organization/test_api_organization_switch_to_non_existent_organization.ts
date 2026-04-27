import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that switching to a non-existent organization returns a 404 error.
 *
 * Validates that the member organization context switch endpoint properly rejects requests targeting organization UUIDs that do not correspond to any existing organization in the system. The member's authentication session should remain unaffected by the failed switch attempt.
 *
 * 1. Register a new member via POST /hrmTimeTracking/auth/member/join.
 * 2. Attempt to switch to a random UUID that does not correspond to any existing organization.
 * 3. Verify the response returns 404 Not Found, confirming the system validates organization existence before context switching.
 */
export async function test_api_organization_switch_to_non_existent_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random UUID not corresponding to any existing organization
  const nonExistentOrganizationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Validate that switching to a non-existent organization returns 404
  await TestValidator.httpError(
    "switch to non-existent organization",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member._switch.organizations.change(
        memberConnection,
        {
          organizationId: nonExistentOrganizationId,
        },
      );
    },
  );
}
