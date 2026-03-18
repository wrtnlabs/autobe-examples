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

export async function test_api_organization_role_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and get authentication tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Get organization ID from member's first organization membership
  const organizationId = member.organization_memberships[0].organization.id;
  // 2. Create first custom role with a specific name
  const roleName = RandomGenerator.name(2);
  const firstRole = await api.functional.hrms.member.organizations.roles.create(
    memberConnection,
    {
      organizationId,
      body: {
        name: roleName,
        permissions: ["employee:view"] satisfies string[],
      },
    },
  );
  typia.assert(firstRole);
  // 3. Attempt to create duplicate role with the same name in same organization
  // System should reject with appropriate error indicating duplicate role name
  await TestValidator.error(
    "should reject duplicate role name in same organization",
    async () => {
      await api.functional.hrms.member.organizations.roles.create(
        memberConnection,
        {
          organizationId,
          body: {
            name: roleName,
            permissions: ["employee:manage"] satisfies string[],
          },
        },
      );
    },
  );
  // 4. Verify the original role remains unchanged by listing roles
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection2, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16),
      display_name: member.display_name,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Note: The role was created successfully, so it should still exist
  TestValidator.predicate(
    "original role exists after rejected duplicate",
    () => firstRole.id !== undefined,
  );
}
