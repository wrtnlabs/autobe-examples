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

export async function test_api_organization_role_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Get organization ID (from first membership or generate one)
  const organizationId: string & tags.Format<"uuid"> =
    member.organization_memberships[0]?.organization.id ??
    globalThis.crypto.randomUUID();
  // 3. Create a custom organization role with permissions
  const customRoleName = RandomGenerator.alphabets(12);
  const testPermissions: string[] = [
    "employee:manage",
    "time:approve",
    "project:view",
  ];
  const createdRole =
    await api.functional.hrms.member.organizations.roles.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: customRoleName,
          permissions: testPermissions,
        } satisfies IHrmsOrganizationRole.ICreate,
      },
    );
  typia.assert(createdRole);
  // 4. Retrieve the created role
  const retrievedRole = await api.functional.hrms.member.organizations.roles.at(
    memberConnection,
    {
      organizationId,
      roleId: createdRole.id,
    },
  );
  typia.assert(retrievedRole);
  // 5. Validate role data
  TestValidator.equals("role name matches", retrievedRole.name, customRoleName);
  TestValidator.equals(
    "is_builtin is false for custom role",
    retrievedRole.is_builtin,
    false,
  );
  TestValidator.equals(
    "permissions array matches",
    retrievedRole.permissions,
    testPermissions,
  );
  TestValidator.predicate(
    "organization context exists",
    retrievedRole.organization !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    !Number.isNaN(Date.parse(retrievedRole.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    !Number.isNaN(Date.parse(retrievedRole.updated_at)),
  );
  TestValidator.equals(
    "role id is valid uuid",
    retrievedRole.id,
    createdRole.id,
  );
}
