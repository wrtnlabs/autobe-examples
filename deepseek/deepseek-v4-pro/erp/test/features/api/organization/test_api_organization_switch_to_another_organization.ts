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
 * Test organization context switching validation for authenticated members.
 *
 * Validates that the organization context switch endpoint enforces membership
 * requirements. A newly joined member has no organization memberships, so
 * switching to an arbitrary organization must fail with a 403 error. Clearing
 * the organization context by passing null is a no-op that succeeds.
 *
 * 1. Join a new member — organizations array is empty after registration.
 * 2. Attempt to switch to an unaffiliated organization — expect 403 Forbidden.
 * 3. Clear the organization context with null — expect 200 OK (no-op).
 */
export async function test_api_organization_switch_to_another_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt to switch to an organization the member does not belong to
  const unrelatedOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "switch to unaffiliated organization fails",
    async () => {
      await api.functional.erpHrm.member.sessions.organizations.switchOrganization(
        memberConnection,
        {
          body: {
            organization_id: unrelatedOrgId,
          } satisfies IErpHrmMemberSession.ISwitchOrganization,
        },
      );
    },
  );
  // 3. Clear organization context with null
  await api.functional.erpHrm.member.sessions.organizations.switchOrganization(
    memberConnection,
    {
      body: {
        organization_id: null,
      } satisfies IErpHrmMemberSession.ISwitchOrganization,
    },
  );
}
