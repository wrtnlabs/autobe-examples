import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member cannot switch their organization context to an organization where they do not have an active employee record — the system must reject the request with 403 Forbidden.
 *
 * Validates the cross-organization data isolation boundary: a member must belong to an organization before they can scope their session to it. The authenticated member is created fresh with no organization memberships, and an attempt to switch to a random organization UUID must be rejected with 403 Forbidden. This confirms that the authorization layer enforces membership checks before allowing organization context switches.
 *
 * 1. Authenticate as a new member via join — the member has no organization memberships.
 * 2. Attempt to switch session context to a random organization UUID the member does not belong to.
 * 3. Verify 403 Forbidden is returned, enforcing the data isolation boundary.
 */
export async function test_api_organization_switch_to_unauthorized_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt to switch to an organization the member does not belong to
  const targetOrganizationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "switch to unauthorized organization returns 403",
    403,
    async () =>
      await api.functional.erpHrm.member.sessions.organizations.switchOrganization(
        memberConnection,
        {
          body: {
            organization_id: targetOrganizationId,
          } satisfies IErpHrmMemberSession.ISwitchOrganization,
        },
      ),
  );
}
