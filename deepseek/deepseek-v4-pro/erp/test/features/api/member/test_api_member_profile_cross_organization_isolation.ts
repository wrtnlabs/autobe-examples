import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
 * Test cross-organization member profile access isolation.
 *
 * Validates that a member authenticated in one organization cannot access the profile of a member who belongs exclusively to a different organization. This ensures data isolation between organizations and prevents information leakage about members outside the current organization context.
 *
 * 1. Member A registers and authenticates, establishing membership in Organization X.
 * 2. Member B registers and authenticates, establishing membership in Organization Y with no shared organization.
 * 3. Member A, using Organization X context, attempts to retrieve Member B's profile via GET /erpHrm/members/{memberB.id}.
 * 4. The system returns 403 Forbidden because Member B has no active employee record in Organization X.
 */
export async function test_api_member_profile_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins (Organization X)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {},
  });
  typia.assert(memberA);
  // 2. Member B joins (Organization Y)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {},
  });
  typia.assert(memberB);
  // 3. Member A attempts to access Member B's profile — must be denied
  await TestValidator.httpError(
    "cross-organization member profile access forbidden",
    403,
    async () => {
      await api.functional.erpHrm.members.at(memberAConnection, {
        memberId: memberB.id,
      });
    },
  );
}
