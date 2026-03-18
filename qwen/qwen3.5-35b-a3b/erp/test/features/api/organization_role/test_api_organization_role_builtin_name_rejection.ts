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
import { generate_random_hrms_member_organizations_roles_create } from "../../../generate/generate_random_hrms_member_organizations_roles_create";
import { prepare_random_hrms_organization_role } from "../../../prepare/prepare_random_hrms_organization_role";

export async function test_api_organization_role_builtin_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member
  const authConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(authConnection, {});
  typia.assert(auth);
  // Extract organization ID from first membership
  if (auth.organization_memberships.length === 0) {
    throw new Error("No organization memberships found for member");
  }
  const organizationId = auth.organization_memberships[0].organization.id;
  // 2. Built-in role names that cannot be used for custom roles
  const builtInRoleNames = ["Owner", "Manager", "Employee"] as const;
  // 3. Test each built-in role name - creation should be rejected
  for (const roleName of builtInRoleNames) {
    await TestValidator.error(
      `should reject custom role with built-in name: ${roleName}`,
      async () => {
        await api.functional.hrms.member.organizations.roles.create(
          authConnection,
          {
            organizationId,
            body: {
              name: roleName,
            } satisfies IHrmsOrganizationRole.ICreate,
          },
        );
      },
    );
  }
}
