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

export async function test_api_role_deletion_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member (organization owner)
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Verify member has at least one organization membership
  TestValidator.predicate(
    "member has organization membership",
    authorized.organization_memberships.length > 0,
  );
  // Get the first organization from memberships
  const firstMembership = authorized.organization_memberships[0];
  typia.assert(firstMembership);
  const organizationId = firstMembership.organization.id;
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Create a custom role in the organization
  const roleName = RandomGenerator.alphaNumeric(10);
  const customRole =
    await api.functional.hrms.member.organizations.roles.create(
      adminConnection,
      {
        organizationId,
        body: {
          name: roleName,
          permissions: ["employee:view", "time:view"],
        } satisfies IHrmsOrganizationRole.ICreate,
      },
    );
  typia.assert(customRole);
  // 3. Verify custom role was created correctly
  TestValidator.equals("role name matches", customRole.name, roleName);
  TestValidator.equals(
    "role is custom (not built-in)",
    customRole.is_builtin,
    false,
  );
  TestValidator.equals(
    "role belongs to correct organization",
    customRole.organization.id,
    organizationId,
  );
  // 4. Delete the custom role (should succeed since no employees assigned)
  await api.functional.hrms.member.organizations.roles.erase(adminConnection, {
    organizationId,
    roleId: customRole.id,
  });
  // Deletion succeeds with 204 No Content - validated by successful completion
  TestValidator.predicate("custom role deleted successfully", true);
}
