import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering sessions by organization context to verify data isolation.
 * 1. Create member with organization using authorize_member_join
 * 2. Filter sessions by specific organization ID
 * 3. Verify sessions match the organization context
 * 4. Filter sessions with null organization_id to find sessions without context
 * 5. Validate organization field reflects correct context
 */
export async function test_api_session_filter_by_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // The member should have at least one organization created during join
  // Get sessions for the member to find the organization ID
  const allSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        erp_hrm_member_id: memberAuth.id,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // Find an organization ID from the sessions
  const sessionWithOrg = allSessions.data.find(
    (session) => session.organization !== null,
  );
  if (sessionWithOrg && sessionWithOrg.organization) {
    const organizationId = sessionWithOrg.organization.id;
    // 2. Filter sessions by the specific organization ID
    const orgFilteredSessions =
      await api.functional.erpHrm.member.sessions.index(memberConnection, {
        body: {
          erp_hrm_organization_id: organizationId,
        } satisfies IErpHrmMemberSession.IRequest,
      });
    typia.assert(orgFilteredSessions);
    // 3. Verify all returned sessions have matching organization
    for (const session of orgFilteredSessions.data) {
      TestValidator.predicate(
        "session organization matches filter",
        session.organization !== null &&
          session.organization.id === organizationId,
      );
    }
    // 4. Filter sessions with null organization_id (sessions without org context)
    const nullOrgSessions = await api.functional.erpHrm.member.sessions.index(
      memberConnection,
      {
        body: {
          erp_hrm_organization_id: null,
        } satisfies IErpHrmMemberSession.IRequest,
      },
    );
    typia.assert(nullOrgSessions);
    // 5. Verify those sessions have null organization field
    for (const session of nullOrgSessions.data) {
      TestValidator.equals(
        "session organization is null",
        session.organization,
        null,
      );
    }
  }
}
