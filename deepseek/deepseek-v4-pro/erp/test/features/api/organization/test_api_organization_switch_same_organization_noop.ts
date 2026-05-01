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
 * Test that switching the organization context to the same organization already
 * set is treated as a no-op.
 *
 * Validates the idempotent case of the organization switch endpoint. When a
 * member sends a switch request with the same organization ID already active
 * in the current session, the server recognizes this as a no-op and returns
 * 200 OK without any side effects — no session modification, no event emission,
 * no permission changes.
 *
 * Since a newly joined member has no organization context (null), this test
 * verifies the no-op behavior by switching to null when null is already the
 * current context. The endpoint specification explicitly states that switching
 * to the same organization is treated as an idempotent success.
 *
 * 1. Register and authenticate a new member via authorize_member_join.
 * 2. Validate the authorized member response structure with typia.assert.
 * 3. Call switchOrganization with organization_id null, matching the initial
 *    null organization context of the new member's session.
 * 4. Verify the call completes without error, confirming the no-op 200 OK.
 */
export async function test_api_organization_switch_same_organization_noop(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Switch to the same organization context (null → null, no-op)
  await api.functional.erpHrm.member.sessions.organizations.switchOrganization(
    memberConnection,
    {
      body: {
        organization_id: null,
      } satisfies IErpHrmMemberSession.ISwitchOrganization,
    },
  );
}
