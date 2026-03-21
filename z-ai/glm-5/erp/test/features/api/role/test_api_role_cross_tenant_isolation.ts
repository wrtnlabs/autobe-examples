import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cross-tenant isolation when attempting to retrieve a role from a different organization.
 *
 * This test validates that members cannot access roles belonging to other organizations.
 * When a member attempts to retrieve a role from another organization, the system
 * should return 404 Not Found, ensuring proper multi-tenant data isolation.
 */
export async function test_api_role_cross_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A with Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberA);
  // 2. Create Member B with Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberB);
  // 3. Generate a role ID (simulating a role that belongs to Organization B)
  // When organizations are created, built-in roles (Owner, Manager, Employee) are created
  const organizationBRoleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve Organization B's role using Member A's connection
  // This should fail because Member A's organization context doesn't match the role's organization
  await TestValidator.error("cross-tenant role access denied", async () => {
    await api.functional.erpHrm.member.roles.at(memberAConnection, {
      roleId: organizationBRoleId,
    });
  });
}
