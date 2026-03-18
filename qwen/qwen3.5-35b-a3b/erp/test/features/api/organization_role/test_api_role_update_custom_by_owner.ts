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

export async function test_api_role_update_custom_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register organization owner and create organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com",
    },
  });
  typia.assert(joinResult);
  // Extract organization ID from first membership
  const orgMembership = joinResult.organization_memberships[0];
  typia.assert(orgMembership);
  const organizationId = orgMembership.organization.id;
  // 2. Create custom role using utility function
  const customRole =
    await generate_random_hrms_member_organizations_roles_create(
      joinConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.alphabets(10),
          permissions: ["employee:view", "time:view", "project:view"],
        },
      },
    );
  typia.assert(customRole);
  // 3. Prepare updated role data
  const updatedName = RandomGenerator.alphabets(12);
  const updatedPermissions = [
    "employee:manage",
    "time:approve",
    "project:edit",
  ];
  // 4. Update the custom role using the authenticated joinConnection
  const updatedRole = await api.functional.hrms.member.roles.update(
    joinConnection,
    {
      roleId: customRole.id,
      body: {
        name: updatedName,
        permissions: updatedPermissions,
      },
    },
  );
  typia.assert(updatedRole);
  // 5. Validate role name updated
  TestValidator.equals("role name updated", updatedRole.name, updatedName);
  // 6. Validate permissions updated
  TestValidator.equals(
    "permissions updated",
    updatedRole.permissions,
    updatedPermissions,
  );
  // 7. Validate organization reference preserved
  TestValidator.equals(
    "organization reference preserved",
    updatedRole.organization.id,
    organizationId,
  );
}
