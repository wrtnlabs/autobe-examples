import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_deletion_built_in_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner account
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  // 2. Create new connection with token from authorized response
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 3. Extract organization and built-in role from organization memberships
  const orgMembership = authorized.organization_memberships[0];
  typia.assert(orgMembership);
  const organization: IHrmsOrganization.ISummary = orgMembership.organization;
  const role: IHrmsOrganizationRole.ISummary = orgMembership.organizationRole;
  typia.assert(organization);
  typia.assert(role);
  // 4. Verify the role is a built-in role
  TestValidator.predicate("role is built-in", role.is_builtin === true);
  // 5. Attempt to delete the built-in role and verify 403 Forbidden
  await TestValidator.error("built-in role deletion rejected", async () => {
    await api.functional.hrms.member.organizations.roles.erase(
      ownerConnection,
      {
        organizationId: organization.id,
        roleId: role.id,
      },
    );
  });
}