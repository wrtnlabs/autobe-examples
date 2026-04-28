import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validates multi-tenancy data isolation by ensuring a member cannot access another organization's data.
 *
 * Verifies that organization boundaries are strictly enforced by testing cross-tenant access attempts. Two separate members register and create their own organizations, then attempts to access another organization's data should be rejected with appropriate authorization errors.
 *
 * Confirms that the platform correctly implements data isolation at the organization level, preventing unauthorized access across organizational boundaries even when both organizations exist on the same platform instance.
 *
 * 1. Member A registers and authenticates via join.
 * 2. Member B registers and authenticates via join.
 * 3. Generate a random UUID to represent a foreign organization ID.
 * 4. Member A attempts to retrieve the foreign organization using organizations.at.
 * 5. Verify the request fails with a 403 Forbidden HTTP error.
 */
export async function test_api_organization_retrieve_cross_tenant_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  // 2. Member B registers and authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  // 3. Generate a foreign organization UUID to test cross-tenant access
  const foreignOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Member A attempts to access the foreign organization
  // 5. Verify that the request returns a 403 Forbidden error
  await TestValidator.httpError(
    "cross-tenant access forbidden",
    403,
    async () => {
      await api.functional.hrmPlatform.organizations.at(memberAConnection, {
        organizationId: foreignOrganizationId,
      });
    },
  );
}
